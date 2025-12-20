package admin

import (
	"ams/backend/auth"
	"database/sql"
	"log"

	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes registers the admin service routes
func RegisterRoutes(router fiber.Router, db *sql.DB) {
	// Create admin group
	admin := router.Group("/admin", requireAdminRole)

	// Admin Dashboard Stats
	admin.Get("/dashboard", func(c *fiber.Ctx) error {
		return getDashboardStats(c, db)
	})

	// User Management List
	admin.Get("/users", func(c *fiber.Ctx) error {
		return getAllUsers(c, db)
	})
	
	// System Health (Placeholder)
	admin.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "healthy",
			"component": "admin-service",
		})
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
		SELECT id, full_name, role, identity_number, wallet_address, 
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
		var id, fullName, role, idNum, walletAddr, joinedAt sql.NullString
		
		if err := rows.Scan(&id, &fullName, &role, &idNum, &walletAddr, &joinedAt); err != nil {
			log.Printf("Error scanning user: %v", err)
			continue
		}

		users = append(users, map[string]interface{}{
			"id":              id.String,
			"full_name":       fullName.String,
			"role":            role.String,
			"identity_number": idNum.String,
			"has_wallet":      walletAddr.Valid && walletAddr.String != "",
			"joined_at":       joinedAt.String,
		})
	}

	if users == nil {
		users = []map[string]interface{}{}
	}

	return c.JSON(users)
}
