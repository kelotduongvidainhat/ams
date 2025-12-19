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
			q := "SELECT id, name, asset_type, owner, value, status, metadata_url, last_tx_id FROM assets WHERE 1=1"
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
					Value       int
					Status      string
					MetadataURL string
					LastTxID    string
				}
				if err := rows.Scan(&r.ID, &r.Name, &r.Type, &r.Owner, &r.Value, &r.Status, &r.MetadataURL, &r.LastTxID); err != nil {
					continue
				}
				results = append(results, map[string]interface{}{
					"id": r.ID, "name": r.Name, "type": r.Type, "owner": r.Owner, 
					"value": r.Value, "status": r.Status, "metadata_url": r.MetadataURL, "last_tx_id": r.LastTxID,
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
					a.asset_type,
					a.value
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
				var value int

				err := rows.Scan(&txID, &assetID, &actionType, &toOwner, &timestamp, &assetName, &assetType, &value)
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
					"value":       value,
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
		userId := c.Query("user_id")
		if userId == "" {
			// Try body for POST requests? Or header?
			// For minimal refactor, we stick to Query or Body 'From' if available
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

	// Get All Assets (Filtered by User Access)
	api.Get("/assets", func(c *fiber.Ctx) error {
		userId := c.Query("user_id")
		userRole := c.Query("user_role")

		contract, err := getContract(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Authentication failed: " + err.Error()})
		}

		log.Printf("Evaluating Transaction: GetAllAssets for User: %s (%s)", userId, userRole)
		evaluateResult, err := contract.EvaluateTransaction("GetAllAssets")

		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		
		// Decode the filtered result in Backend (since Chaincode returns ALL)
        // Note: For large datasets, this filtering MUST move to Chaincode (GetAssetsForUser).
        // For Filter 4.0 MVP, we do it here.
        var allAssets []map[string]interface{}
        if err := json.Unmarshal(evaluateResult, &allAssets); err != nil {
             return c.Status(500).JSON(fiber.Map{"error": "Failed to parse chaincode response"})
        }

        var visibleAssets []map[string]interface{}
        for _, asset := range allAssets {
            // Logic: 
            // 1. Admin sees everything
            // 2. Owner sees their assets
            // 3. Viewers list contains userId OR "EVERYONE"
            
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

	// Create Asset
	api.Post("/assets", func(c *fiber.Ctx) error {
		type AssetRequest struct {
			ID          string `json:"id"`
			Name        string `json:"name"`
			Type        string `json:"type"`
			Owner       string `json:"owner"`
			Value       int    `json:"value"`
			Status      string `json:"status"`
			MetadataURL string `json:"metadata_url"`
		}

		p := new(AssetRequest)
		if err := c.BodyParser(p); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot parse JSON"})
		}

		// Use the Owner field as the submitting identity if possible, or X-User-ID
		// Here we assume the frontend sends the creator's ID in Query or Header
		// Ideally p.Owner IS the creator.
		
		// Allow overriding via Query for simulation
		submittingUser := c.Query("user_id") 
		if submittingUser == "" { submittingUser = p.Owner } // Fallback to owner field
		
		c.Request().Header.Set("X-User-ID", submittingUser) // Pass to helper
		
		contract, err := getContract(c)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "Auth failed: " + err.Error()})
		}

		// Calculate Hash (Simple simulation)
		// Real implementation would hash the file content from metadata_url or upload
		metadataHash := fmt.Sprintf("%x", sha256.Sum256([]byte(p.MetadataURL + p.Name))) // Dummy logic for now

		log.Printf("Submitting Transaction: CreateAsset, ID: %s", p.ID)
		
		// CreateAsset(id, name, type, owner, value, status, metadataUrl, metadataHash)
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


	// Get Asset History
	api.Get("/assets/:id/history", func(c *fiber.Ctx) error {
		contract, err := getContract(c)
		if err != nil { return c.Status(401).JSON(fiber.Map{"error": err.Error()}) }

		id := c.Params("id")
		log.Printf("Evaluating Transaction: GetAssetHistory, ID: %s", id)

		evaluateResult, err := contract.EvaluateTransaction("GetAssetHistory", id)

		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		c.Set("Content-Type", "application/json")
		return c.Send(evaluateResult)
	})

	// Transfer Asset
	api.Put("/assets/:id/transfer", func(c *fiber.Ctx) error {
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


	// Grant Access
	api.Post("/assets/:id/access", func(c *fiber.Ctx) error {
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

	// --- USER Management ---

	// Register User
	api.Post("/users", func(c *fiber.Ctx) error {
		// NOTE: This currently creates User On-Chain (Ledger).
		// ideally it should also Call Fabric CA to register the MSP identity if Real Identity.
		
		contract, err := getContract(c)
		if err != nil { return c.Status(401).JSON(fiber.Map{"error": err.Error()}) }

		type UserRequest struct {
			ID             string `json:"id"`
			FullName       string `json:"full_name"`
			IdentityNumber string `json:"identity_number"`
			Role           string `json:"role"`
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

		return c.JSON(fiber.Map{
			"message": "User registered successfully", 
			"id": p.ID, 
		})
	})

	// Get User Details
	api.Get("/users/:id", func(c *fiber.Ctx) error {
		contract, err := getContract(c)
		if err != nil { return c.Status(401).JSON(fiber.Map{"error": err.Error()}) }

		id := c.Params("id")
		log.Printf("Evaluating Transaction: ReadUser, ID: %s", id)
		
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
