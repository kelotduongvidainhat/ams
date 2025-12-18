package main

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"

	"ams/backend/fabric"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	// Initialize Fiber app
	app := fiber.New()

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New())

	// routes
	api := app.Group("/api")

	// Connect to Fabric
	log.Println("Connecting to Fabric Network...")
	contract, err := fabric.InitContract()
	if err != nil {
		log.Fatalf("Failed to connect to Fabric: %v", err)
	}
	log.Println("Connected to Fabric Network successfully!")

	// Health Check
	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"message": "AMS Backend is running",
		})
	})

	// Get All Assets (Filtered by User Access)
	api.Get("/assets", func(c *fiber.Ctx) error {
        // In a real app, these would come from the JWT Token in Context
		userId := c.Query("user_id")
		userRole := c.Query("user_role")

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

		// Calculate Hash (Simple simulation)
		// Real implementation would hash the file content from metadata_url or upload
		metadataHash := fmt.Sprintf("%x", sha256.Sum256([]byte(p.MetadataURL + p.Name))) // Dummy logic for now

		log.Printf("Submitting Transaction: CreateAsset, ID: %s", p.ID)
		
		// CreateAsset(id, name, type, owner, value, status, metadataUrl, metadataHash)
		_, err := contract.SubmitTransaction("CreateAsset", 
			p.ID, 
			p.Name, 
			p.Type, 
			p.Owner, 
			fmt.Sprintf("%d", p.Value), 
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
		id := c.Params("id")
		type TransferRequest struct {
			NewOwner string `json:"new_owner"`
		}
		p := new(TransferRequest)
		if err := c.BodyParser(p); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot parse JSON"})
		}

		log.Printf("Submitting Transaction: TransferAsset, ID: %s to %s", id, p.NewOwner)
		_, err := contract.SubmitTransaction("TransferAsset", id, p.NewOwner)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to transfer asset: " + err.Error()})
		}

		return c.JSON(fiber.Map{"message": "Asset transferred successfully"})
	})


	// Grant Access
	api.Post("/assets/:id/access", func(c *fiber.Ctx) error {
		id := c.Params("id")
		type AccessRequest struct {
			ViewerID string `json:"viewer_id"`
		}
		p := new(AccessRequest)
		if err := c.BodyParser(p); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Cannot parse JSON"})
		}

		log.Printf("Submitting Transaction: GrantAccess for Asset %s to %s", id, p.ViewerID)
		_, err := contract.SubmitTransaction("GrantAccess", id, p.ViewerID)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to grant access: " + err.Error()})
		}

		return c.JSON(fiber.Map{"message": "Access granted successfully"})
	})

	// --- USER Management ---

	// Register User
	api.Post("/users", func(c *fiber.Ctx) error {
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
		
		_, err := contract.SubmitTransaction("CreateUser", 
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
