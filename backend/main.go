package main

import (
	"crypto/sha256"
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

	// Get All Assets
	api.Get("/assets", func(c *fiber.Ctx) error {
		log.Println("Evaluating Transaction: GetAllAssets")
		evaluateResult, err := contract.EvaluateTransaction("GetAllAssets")
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}
		
		// Return raw JSON from chaincode
		c.Set("Content-Type", "application/json")
		return c.Send(evaluateResult)
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
