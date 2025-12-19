package main

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"

	"os"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/hyperledger/fabric-gateway/pkg/client"

	"ams/backend/fabric"
	"ams/backend/sync"
	"ams/backend/auth"
)


func main() {
	// Initialize Fiber app
	app := fiber.New()

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New())

	// routes
	api := app.Group("/api")

	// Connect to Fabric Service
	log.Println("Connecting to Fabric Network Service...")
	fabService, err := fabric.InitService()
	if err != nil {
		log.Fatalf("Failed to connect to Fabric Service: %v", err)
	}
	log.Println("Connected to Fabric Service successfully!")

	// Connect to PostgreSQL
	pgInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("POSTGRES_HOST"), "5432", "ams_user", "ams_password", "ams_db")
	// If running locally (not in docker), default to localhost
	if os.Getenv("POSTGRES_HOST") == "" {
		pgInfo = "host=localhost port=5432 user=ams_user password=ams_password dbname=ams_db sslmode=disable"
	}

	pgDB, err := sync.ConnectPostgres(pgInfo)
	if err != nil {
		log.Printf("⚠️ Failed to connect to PostgreSQL (Indexing disabled): %v", err)
	} else {
		log.Println("✅ Connected to PostgreSQL for Off-Chain Indexing")
		
		// Start Block Listener (Using User1 as System Listener)
		// We obtain a dedicated network connection for the listener
		sysNetwork, err := fabService.GetNetworkForUser("User1") 
		if err != nil {
			log.Printf("⚠️ Failed to start listener (User1 wallet missing?): %v", err)
		} else {
			listener := &sync.BlockListener{
				Network:   sysNetwork,
				DB:        pgDB,
				Chaincode: "basic",
			}
			go listener.StartEventListening()
		}
	}


	// Public Explorer Endpoint (PostgreSQL)
	if pgDB != nil {
		api.Get("/explorer/assets", func(c *fiber.Ctx) error {
			search := c.Query("search")
			owner := c.Query("owner")
			itemType := c.Query("type")

			log.Printf("🔎 Explorer Query - Search: %s, Owner: %s, Type: %s", search, owner, itemType)

			// Build Query
			q := "SELECT id, name, asset_type, owner, status, metadata_url, last_tx_id FROM assets WHERE 1=1"
			args := []interface{}{}
			argId := 1

			if search != "" {
				q += fmt.Sprintf(" AND name ILIKE $%d", argId)
				args = append(args, "%"+search+"%")
				argId++
			}
			if owner != "" {
				q += fmt.Sprintf(" AND owner = $%d", argId)
				args = append(args, owner)
				argId++
			}
			if itemType != "" {
				q += fmt.Sprintf(" AND asset_type = $%d", argId)
				args = append(args, itemType)
				argId++
			}

			q += " ORDER BY updated_at DESC LIMIT 50"

			rows, err := pgDB.Query(q, args...)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Database query failed: " + err.Error()})
			}
			defer rows.Close()

			var results []map[string]interface{}
			for rows.Next() {
				var r struct {
					ID          string
					Name        string
					Type        string
					Owner       string
					Status      string
					MetadataURL string
					LastTxID    string
				}
				if err := rows.Scan(&r.ID, &r.Name, &r.Type, &r.Owner, &r.Status, &r.MetadataURL, &r.LastTxID); err != nil {
					continue
				}
				results = append(results, map[string]interface{}{
					"id": r.ID, "name": r.Name, "type": r.Type, "owner": r.Owner, 
					"status": r.Status, "metadata_url": r.MetadataURL, "last_tx_id": r.LastTxID,
				})
			}
			
			if results == nil {
				results = []map[string]interface{}{}
			}

			return c.JSON(results)
		})

		// Public Transaction History Endpoint (Last 24 hours)
		api.Get("/explorer/transactions", func(c *fiber.Ctx) error {
			log.Println("🕐 Fetching last 24h transaction history from PostgreSQL")

			query := `
				SELECT 
					h.tx_id,
					h.asset_id,
					h.action_type,
					h.to_owner,
					h.timestamp,
					a.name as asset_name,
					a.asset_type
				FROM asset_history h
				LEFT JOIN assets a ON h.asset_id = a.id
				WHERE h.timestamp >= NOW() - INTERVAL '24 hours'
				ORDER BY h.timestamp DESC
				LIMIT 100
			`

			rows, err := pgDB.Query(query)
			if err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch transaction history: " + err.Error()})
			}
			defer rows.Close()

			var transactions []map[string]interface{}
			for rows.Next() {
				var txID, assetID, actionType, toOwner, assetName, assetType string
				var timestamp string

				err := rows.Scan(&txID, &assetID, &actionType, &toOwner, &timestamp, &assetName, &assetType)
				if err != nil {
					log.Printf("Error scanning transaction row: %v", err)
					continue
				}

				transactions = append(transactions, map[string]interface{}{
					"tx_id":       txID,
					"asset_id":    assetID,
					"asset_name":  assetName,
					"asset_type":  assetType,
					"action_type": actionType,
					"to_owner":    toOwner,
					"timestamp":   timestamp,
				})
			}

			if transactions == nil {
				transactions = []map[string]interface{}{}
			}

			log.Printf("✅ Returned %d transactions from last 24h", len(transactions))
			return c.JSON(transactions)
		})
	}

	// Health Check
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"message": "AMS Backend is running",
		})
	})
	
	// Helper to get contract based on user_id context
	getContract := func(c *fiber.Ctx) (*client.Contract, error) {
		// 1. Check JWT Context first (Priority for Secured Endpoints)
		if user, ok := c.Locals("user").(*auth.Claims); ok {
			log.Printf("🔐 acting as (JWT): %s", user.UserID)
			return fabService.GetContractForUser(user.UserID)
		}

		// 2. Fallback to Query/Header (Legacy/Public Access)
		userId := c.Query("user_id")
		if userId == "" {
			userId = "User1" // Default fallback for now
		}
		
		// Check for header override
		if h := c.Get("X-User-ID"); h != "" {
			userId = h
		}

		// Log identity use
		log.Printf("🔐 acting as: %s", userId)
		return fabService.GetContractForUser(userId)
	}

	// --- AUTH SERVICE ---

	// Login
	api.Post("/auth/login", func(c *fiber.Ctx) error {
		type LoginRequest struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}
		p := new(LoginRequest)
		if err := c.BodyParser(p); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot parse JSON"})
		}

		if pgDB == nil {
			return c.Status(503).JSON(fiber.Map{"error": "Database not available for auth"})
		}

		var passwordHash string
		var role string
		err := pgDB.QueryRow("SELECT password_hash, role FROM users WHERE id = $1", p.Username).Scan(&passwordHash, &role)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
		}

		if !auth.CheckPasswordHash(p.Password, passwordHash) {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid credentials"})
		}

		token, err := auth.GenerateJWT(p.Username, role)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to generate token"})
		}

		return c.JSON(fiber.Map{
			"token": token,
			"user": fiber.Map{
				"id": p.Username,
				"role": role,
			},
		})
	})

// Set Password for Existing User (without creating on blockchain)
api.Post("/auth/set-password", func(c *fiber.Ctx) error {
	type SetPasswordRequest struct {
		UserID   string `json:"user_id"`
		Password string `json:"password"`
	}
	p := new(SetPasswordRequest)
	if err := c.BodyParser(p); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if pgDB == nil {
		return c.Status(503).JSON(fiber.Map{"error": "Database not available"})
	}

	// Hash the password
	hash, err := auth.HashPassword(p.Password)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	// Update password in PostgreSQL (user must already exist)
	result, err := pgDB.Exec("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", hash, p.UserID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database error: " + err.Error()})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "User not found in database. User must be synced from blockchain first."})
	}

	return c.JSON(fiber.Map{
		"message": "Password set successfully",
		"user_id": p.UserID,
	})
})

	// Middleware for Protected Routes
	protected := api.Group("/protected")
	protected.Use(func(c *fiber.Ctx) error {
		tokenString := c.Get("Authorization")
		if len(tokenString) < 7 || tokenString[:7] != "Bearer " {
			return c.Status(401).JSON(fiber.Map{"error": "Missing or invalid token"})
		}
		tokenString = tokenString[7:]

		claims, err := auth.ValidateJWT(tokenString)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Invalid token"})
		}

		c.Locals("user", claims)
		return c.Next()
	})

	
	// Create Asset (Protected)
	protected.Post("/assets", func(c *fiber.Ctx) error {
		type AssetRequest struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			Type        string `json:"type"`
			Owner       string `json:"owner"` // Optional, defaults to JWT user
			Status      string `json:"status"`
			MetadataURL string `json:"metadata_url"`
		}

		p := new(AssetRequest)
		if err := c.BodyParser(p); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot parse JSON"})
		}

		// Enforce Owner = JWT User (unless Admin?)
		// For now, simpler: Owner is the Creator
		claims := c.Locals("user").(*auth.Claims)
		p.Owner = claims.UserID

		contract, err := getContract(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Auth failed: " + err.Error()})
		}

		// Calculate Hash (Simple simulation)
		metadataHash := fmt.Sprintf("%x", sha256.Sum256([]byte(p.MetadataURL + p.Name)))

		log.Printf("Submitting Transaction: CreateAsset, ID: %s", p.ID)
		
		_, err = contract.SubmitTransaction("CreateAsset", 
			p.ID, 
			p.Name, 
			p.Type, 
			p.Owner, 
			p.Status, 
			p.MetadataURL, 
			metadataHash,
		)

		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to submit transaction: " + err.Error()})
		}

		return c.JSON(fiber.Map{
			"message": "Asset created successfully", 
			"id": p.ID, 
			"hash": metadataHash,
		})
	})
	
	// Transfer Asset (Protected)
	protected.Put("/assets/:id/transfer", func(c *fiber.Ctx) error {
		contract, err := getContract(c)
		if err != nil { return c.Status(401).JSON(fiber.Map{"error": err.Error()}) }
		
		id := c.Params("id")
		type TransferRequest struct {
			NewOwner string `json:"new_owner"`
		}
		p := new(TransferRequest)
		if err := c.BodyParser(p); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot parse JSON"})
		}

		log.Printf("Submitting Transaction: TransferAsset, ID: %s to %s", id, p.NewOwner)
		_, err = contract.SubmitTransaction("TransferAsset", id, p.NewOwner)

		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to transfer asset: " + err.Error()})
		}

		return c.JSON(fiber.Map{"message": "Asset transferred successfully"})
	})

	// Grant Access (Protected)
	protected.Post("/assets/:id/access", func(c *fiber.Ctx) error {
		contract, err := getContract(c)
		if err != nil { return c.Status(401).JSON(fiber.Map{"error": err.Error()}) }

		id := c.Params("id")
		type AccessRequest struct {
			ViewerID string `json:"viewer_id"`
		}
		p := new(AccessRequest)
		if err := c.BodyParser(p); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot parse JSON"})
		}

		log.Printf("Submitting Transaction: GrantAccess for Asset %s to %s", id, p.ViewerID)
		_, err = contract.SubmitTransaction("GrantAccess", id, p.ViewerID)

		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to grant access: " + err.Error()})
		}

		return c.JSON(fiber.Map{"message": "Access granted successfully"})
	})

	// Get All Assets (Filtered by User Access) - Legacy Public/Private hybrid
	api.Get("/assets", func(c *fiber.Ctx) error {
		userId := c.Query("user_id")
		userRole := c.Query("user_role")

		// If JWT is present in header, prefer it?
		// Note: Frontend might not send bearer for this public-ish view yet.
		
		contract, err := getContract(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Authentication failed: " + err.Error()})
		}

		log.Printf("Evaluating Transaction: GetAllAssets for User: %s (%s)", userId, userRole)
		evaluateResult, err := contract.EvaluateTransaction("GetAllAssets")

		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		
        var allAssets []map[string]interface{}
        if err := json.Unmarshal(evaluateResult, &allAssets); err != nil {
             return c.Status(500).JSON(fiber.Map{"error": "Failed to parse chaincode response"})
        }

        var visibleAssets []map[string]interface{}
        for _, asset := range allAssets {
            owner, _ := asset["owner"].(string)
            viewersInterface, ok := asset["viewers"].([]interface{})
            
            isViewer := false
            if ok {
                for _, v := range viewersInterface {
                    if s, ok := v.(string); ok && (s == userId || s == "EVERYONE") {
                        isViewer = true
                        break
                    }
                }
            }
            
            // Check Access
            if userRole == "Admin" {
                 visibleAssets = append(visibleAssets, asset)
            } else if owner == userId || isViewer {
                 visibleAssets = append(visibleAssets, asset)
            }
        }

		return c.JSON(visibleAssets)
	})

	// Create Asset (Legacy Unprotected - Keep for scripts?)
	// Moving to protected.Post("/assets") above.
	// We commented out the old "api.Post('/assets')" to force usage of protected or new structure.
	// But sample data scripts use unprotected.
	// Let's Keep unprotected for now for scripts, but warn.
	
	api.Post("/assets", func(c *fiber.Ctx) error {
		type AssetRequest struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			Type        string `json:"type"`
			Owner       string `json:"owner"`
			Status      string `json:"status"`
			MetadataURL string `json:"metadata_url"`
		}

		p := new(AssetRequest)
		if err := c.BodyParser(p); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot parse JSON"})
		}
		
		submittingUser := c.Query("user_id") 
		if submittingUser == "" { submittingUser = p.Owner } 
		c.Request().Header.Set("X-User-ID", submittingUser)
		
		contract, err := getContract(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Auth failed: " + err.Error()})
		}

		metadataHash := fmt.Sprintf("%x", sha256.Sum256([]byte(p.MetadataURL + p.Name)))
		log.Printf("Submitting Transaction: CreateAsset (Public), ID: %s", p.ID)
		
		_, err = contract.SubmitTransaction("CreateAsset", p.ID, p.Name, p.Type, p.Owner, p.Status, p.MetadataURL, metadataHash)

		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to submit transaction: " + err.Error()})
		}

		return c.JSON(fiber.Map{"message": "Asset created successfully", "id": p.ID})
	})

	// Get Asset History
	api.Get("/assets/:id/history", func(c *fiber.Ctx) error {
		contract, err := getContract(c)
		if err != nil { return c.Status(401).JSON(fiber.Map{"error": err.Error()}) }

		id := c.Params("id")
		evaluateResult, err := contract.EvaluateTransaction("GetAssetHistory", id)
		if err != nil { return c.Status(500).JSON(fiber.Map{"error": err.Error()}) }
		c.Set("Content-Type", "application/json")
		return c.Send(evaluateResult)
	})


	// --- WALLET SERVICE ---

	// Register Wallet (enrolls user with CA + creates on-chain)
	api.Post("/wallet/register", func(c *fiber.Ctx) error {
		type WalletRequest struct {
			Username       string `json:"username"`
			Password       string `json:"password"`
			FullName       string `json:"full_name"`
			IdentityNumber string `json:"identity_number"`
		}

		p := new(WalletRequest)
		if err := c.BodyParser(p); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot parse JSON"})
		}

		log.Printf("🔹 WALLET: Register request for %s", p.Username)

		// 1. Enroll with CA
		caClient := fabric.NewCAClient()
		err := caClient.RegisterAndEnroll(p.Username, p.Password)
		if err != nil {
			log.Printf("❌ WALLET: CA Registration failed: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "CA Registration failed: " + err.Error()})
		}
		
		// 1.5 Hash Password for DB
		hash, _ := auth.HashPassword(p.Password)

		// 2. Register On-Chain (CreateUser in Ledger)
		c.Request().Header.Set("X-User-ID", p.Username) 
		
		contract, err := getContract(c)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to connect to network as new user: " + err.Error()})
		}
		
		log.Printf("🔹 WALLET: Creating User on-chain %s...", p.Username)
		_, err = contract.SubmitTransaction("CreateUser", 
			p.Username, 
			p.FullName, 
			p.IdentityNumber, 
			"User", 
		)

		if err != nil {
			log.Printf("❌ WALLET: On-Chain creation failed: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create user on ledger: " + err.Error()})
		}
		
		// 3. Update Password Hash in DB (since Sync Listener only syncs ID/Role, not password)
		if pgDB != nil {
			_, err = pgDB.Exec("UPDATE users SET password_hash = $1 WHERE id = $2", hash, p.Username)
			if err != nil {
				log.Printf("⚠️ Failed to update password hash: %v", err)
			}
		}

		return c.JSON(fiber.Map{
			"message": "User registered and enrolled successfully",
			"username": p.Username,
		})
	})

	// --- USER Management ---

	// Register User (Manual)
	api.Post("/users", func(c *fiber.Ctx) error {
		contract, err := getContract(c)
		if err != nil { return c.Status(401).JSON(fiber.Map{"error": err.Error()}) }

		type UserRequest struct {
			ID             string `json:"id"`
			FullName       string `json:"full_name"`
			IdentityNumber string `json:"identity_number"`
			Role           string `json:"role"`
			Password       string `json:"password"` // Optional: Set password for existing manual users
		}

		p := new(UserRequest)
		if err := c.BodyParser(p); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot parse JSON"})
		}

		log.Printf("Submitting Transaction: CreateUser, ID: %s", p.ID)
		
		_, err = contract.SubmitTransaction("CreateUser", 
			p.ID, 
			p.FullName, 
			p.IdentityNumber, 
			p.Role, 
		)

		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to register user: " + err.Error()})
		}
		
		// Optional: Hash Password
		if p.Password != "" && pgDB != nil {
			hash, _ := auth.HashPassword(p.Password)
			pgDB.Exec("UPDATE users SET password_hash = $1 WHERE id = $2", hash, p.ID)
		}

		return c.JSON(fiber.Map{"message": "User registered successfully", "id": p.ID})
	})

	// Get User Details
	api.Get("/users/:id", func(c *fiber.Ctx) error {
		contract, err := getContract(c)
		if err != nil { return c.Status(401).JSON(fiber.Map{"error": err.Error()}) }

		id := c.Params("id")
		evaluateResult, err := contract.EvaluateTransaction("ReadUser", id)

		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "User not found or error: " + err.Error()})
		}

		c.Set("Content-Type", "application/json")
		return c.Send(evaluateResult)
	})

	// Start server (Async)
	log.Fatal(app.Listen(":3000"))
}
