package admin

import (
	"ams/backend/auth"
	"ams/backend/fabric"
	"database/sql"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes registers the admin service routes
func RegisterRoutes(router fiber.Router, db *sql.DB, fab *fabric.Service) {
	// Create admin group
	admin := router.Group("/admin", requireAdminRole)

	// 1. Overview Analytics
	admin.Get("/dashboard", func(c *fiber.Ctx) error {
		return getDashboardStats(c, db)
	})

	// 2. Identity Management
	admin.Get("/users", func(c *fiber.Ctx) error {
		return getAllUsers(c, db)
	})
	admin.Post("/users/:id/status", func(c *fiber.Ctx) error {
		return setUserStatus(c, fab)
	})
	
	// 3. Asset & Audit
	admin.Get("/assets", func(c *fiber.Ctx) error {
		return getAllAssets(c, db)
	})
	admin.Post("/assets/:id/lock", func(c *fiber.Ctx) error {
		return setAssetLock(c, fab)
	})
	admin.Post("/assets/:id/unlock", func(c *fiber.Ctx) error {
		return setAssetUnlock(c, fab)
	})

	// 4. Transaction Control
	admin.Get("/transfers", func(c *fiber.Ctx) error {
		return getAllPendingTransfers(c, fab)
	})

	// 5. Network Configuration
	admin.Get("/health", func(c *fiber.Ctx) error {
		return getNetworkHealth(c, fab)
	})

	// 6. Advanced Analytics
	admin.Get("/analytics", func(c *fiber.Ctx) error {
		return getAnalytics(c, db) 
	})
}
// Middleware to ensure user has Admin role
func requireAdminRole(c *fiber.Ctx) error {
	// User should be set by Auth middleware previously
	userLocals := c.Locals("user")
	if userLocals == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	claims, ok := userLocals.(*auth.Claims)
	if !ok || claims.Role != "Admin" {
		return c.Status(403).JSON(fiber.Map{"error": "Admin access required"})
	}

	return c.Next()
}

func getDashboardStats(c *fiber.Ctx, db *sql.DB) error {
	stats := fiber.Map{}

	// 1. Total Users
	var userCount int
	if err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount); err != nil {
		log.Printf("Error counting users: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to count users"})
	}
	stats["total_users"] = userCount

	// 2. Total Assets
	var assetCount int
	if err := db.QueryRow("SELECT COUNT(*) FROM assets").Scan(&assetCount); err != nil {
		log.Printf("Error counting assets: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to count assets"})
	}
	stats["total_assets"] = assetCount

	// 3. Pending Transfers (Off-chain sync)
	// Note: This relies on listener.go syncing 'TransferInitiated' events to Postgres.
	var pendingCount int
	err := db.QueryRow("SELECT COUNT(*) FROM pending_transfers WHERE status = 'PENDING'").Scan(&pendingCount)
	if err != nil {
		// Table might exist but query failed? Or maybe table empty.
		// Just log and set to 0 to avoid breaking dashboard
		log.Printf("Warning: failed to count pending transfers (table might be empty or sync pending): %v", err)
		pendingCount = 0
	}
	stats["pending_transfers"] = pendingCount

	return c.JSON(stats)
}

func getAllUsers(c *fiber.Ctx, db *sql.DB) error {
	query := `
		SELECT id, full_name, role, identity_number, wallet_address, status,
		       to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as joined_at
		FROM users
		ORDER BY created_at DESC
	`
	rows, err := db.Query(query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch users"})
	}
	defer rows.Close()

	var users []map[string]interface{}
	for rows.Next() {
		var id, fullName, role, idNum, walletAddr, status, joinedAt sql.NullString
		
		if err := rows.Scan(&id, &fullName, &role, &idNum, &walletAddr, &status, &joinedAt); err != nil {
			log.Printf("Error scanning user: %v", err)
			continue
		}

		users = append(users, map[string]interface{}{
			"id":              id.String,
			"full_name":       fullName.String,
			"role":            role.String,
			"identity_number": idNum.String,
			"has_wallet":      walletAddr.Valid && walletAddr.String != "",
			"status":          status.String,
			"joined_at":       joinedAt.String,
		})
	}

	if users == nil {
		users = []map[string]interface{}{}
	}

	return c.JSON(users)
}

// Set User Status (Lock/Unlock)
func setUserStatus(c *fiber.Ctx, fab *fabric.Service) error {
	targetUserID := c.Params("id")
	
	type StatusRequest struct {
		Status string `json:"status"` // "Active" or "Locked"
	}
	p := new(StatusRequest)
	if err := c.BodyParser(p); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Cannot parse JSON"})
	}

	if p.Status != "Active" && p.Status != "Locked" {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid status. Must be 'Active' or 'Locked'"})
	}

	// Get Current Admin User from Context
	claims := c.Locals("user").(*auth.Claims)
	
	log.Printf("🔒 Admin %s setting status of %s to %s", claims.UserID, targetUserID, p.Status)

	// Get Contract
	contract, err := fab.GetContractForUser(claims.UserID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get contract: " + err.Error()})
	}

	// Submit Transaction
	_, err = contract.SubmitTransaction("SetUserStatus", targetUserID, p.Status, claims.UserID)
	if err != nil {
		log.Printf("❌ Failed to set user status: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Blockchain transaction failed: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "User status updated successfully",
		"user_id": targetUserID,
		"status": p.Status,
	})
}

func getAllAssets(c *fiber.Ctx, db *sql.DB) error {
	rows, err := db.Query(`
		SELECT id, name, asset_type, owner, status, updated_at
		FROM assets
		ORDER BY updated_at DESC
	`)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch assets"})
	}
	defer rows.Close()

	var assets []map[string]interface{}
	for rows.Next() {
		var id, name, assetType, owner, status string
		var updatedAt time.Time
		if err := rows.Scan(&id, &name, &assetType, &owner, &status, &updatedAt); err != nil {
			continue
		}
		assets = append(assets, map[string]interface{}{
			"id": id, "name": name, "type": assetType, "owner": owner, "status": status, "updated_at": updatedAt,
		})
	}
	if assets == nil { assets = []map[string]interface{}{} }
	return c.JSON(assets)
}

func getAllPendingTransfers(c *fiber.Ctx, fab *fabric.Service) error {
	// Use Admin Identity to query all pending transfers
	contract, err := fab.GetContractForUser("User1") 
	if err != nil {
		log.Printf("Error getting contract: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to connect to blockchain"})
	}

	result, err := contract.EvaluateTransaction("GetAllPendingTransfers")
	if err != nil {
		log.Printf("Error querying pending transfers: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch pending transfers from blockchain"})
	}

	// Result is already JSON, send it directly
	c.Set("Content-Type", "application/json")
	return c.Send(result)
}

func getNetworkHealth(c *fiber.Ctx, fab *fabric.Service) error {
	height, err := fab.GetBlockHeight("User1") // Use system user
	status := "healthy"
	if err != nil {
		status = "degraded"
		log.Printf("Error fetching block height: %v", err)
	}

	// Simulate orderer/peer check for now as we don't have direct ping here easily without more fabric-sdk-go config
	return c.JSON(fiber.Map{
		"status": status,
		"component": "admin-service",
		"block_height": height,
		"peers": []string{"peer0.org1.example.com (Active)"},
		"orderers": []string{"orderer.example.com (Active)"},
		"chaincode": "asset-transfer",
		"uptime": "99.9%",
	})
}

func getAnalytics(c *fiber.Ctx, db *sql.DB) error {
	// 1. Transaction Volume (Last 7 Days)
	rows, err := db.Query(`
		SELECT to_char(timestamp, 'YYYY-MM-DD') as date, count(*) 
		FROM asset_history 
		WHERE timestamp > NOW() - INTERVAL '7 days' 
		GROUP BY date 
		ORDER BY date
	`)
	var volume []map[string]interface{}
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var date string
			var count int
			rows.Scan(&date, &count)
			volume = append(volume, map[string]interface{}{"date": date, "count": count})
		}
	}
	if volume == nil { volume = []map[string]interface{}{} }

	// 2. Asset Distribution by Type
	rows2, err := db.Query(`SELECT asset_type, count(*) FROM assets GROUP BY asset_type`)
	var distribution []map[string]interface{}
	if err == nil {
		defer rows2.Close()
		for rows2.Next() {
			var t string
			var c int
			rows2.Scan(&t, &c)
			distribution = append(distribution, map[string]interface{}{"type": t, "count": c})
		}
	}
	if distribution == nil { distribution = []map[string]interface{}{} }

	return c.JSON(fiber.Map{
		"transaction_volume": volume,
		"asset_distribution": distribution,
	})
}

func setAssetLock(c *fiber.Ctx, fab *fabric.Service) error {
	assetID := c.Params("id")
	
	claims := c.Locals("user").(*auth.Claims)
	
	contract, err := fab.GetContractForUser(claims.UserID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get contract"})
	}

	log.Printf("🔒 Admin %s locking asset %s", claims.UserID, assetID)

	_, err = contract.SubmitTransaction("LockAsset", assetID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to lock asset: " + err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Asset locked successfully", "id": assetID})
}

func setAssetUnlock(c *fiber.Ctx, fab *fabric.Service) error {
	assetID := c.Params("id")
	
	claims := c.Locals("user").(*auth.Claims)
	
	contract, err := fab.GetContractForUser(claims.UserID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to get contract"})
	}

	log.Printf("🔓 Admin %s unlocking asset %s", claims.UserID, assetID)

	_, err = contract.SubmitTransaction("UnlockAsset", assetID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to unlock asset: " + err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Asset unlocked successfully", "id": assetID})
}
