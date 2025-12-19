package sync

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/hyperledger/fabric-gateway/pkg/client"
	_ "github.com/lib/pq"
)

// BlockListener listens for chaincode events and syncs them to PostgreSQL
type BlockListener struct {
	Network   *client.Network
	DB        *sql.DB
	Chaincode string
}

// Asset matches the chaincode structure
type Asset struct {
	ID           string   `json:"ID"`
	DocType      string   `json:"docType"`
	Name         string   `json:"name"`
	Type         string   `json:"type"`
	Owner        string   `json:"owner"`
	Status       string   `json:"status"`
	MetadataURL  string   `json:"metadata_url"`
	MetadataHash string   `json:"metadata_hash"`
	Viewers      []string `json:"viewers"`
}

// User structure matching chaincode
type User struct {
	ID             string `json:"id"`
	FullName       string `json:"full_name"`
	IdentityNumber string `json:"identity_number"`
	Role           string `json:"role"`
	WalletAddress  string `json:"wallet_address"`
}

// StartEventListening begins the infinite loop of event processing
func (bl *BlockListener) StartEventListening() {
	log.Println("🔄 Starting Block Listener Service for Chaincode:", bl.Chaincode)

	// Get the chaincode events channel
	events, err := bl.Network.ChaincodeEvents(context.Background(), bl.Chaincode)
	if err != nil {
		log.Fatalf("❌ Failed to get chaincode events: %v", err)
	}


	// Consume events
	for event := range events {
		log.Printf("📥 Received Event: %s (TxID: %s, Block: %d)", event.EventName, event.TransactionID, event.BlockNumber)

		
		switch event.EventName {
		case "AssetCreated", "AssetUpdated", "AssetTransferred", "AccessGranted", "AccessRevoked":
			processAssetEvent(bl.DB, event)
		case "AssetDeleted":
			processDeleteEvent(bl.DB, event)
		case "UserCreated":
			processUserEvent(bl.DB, event)
		}
	}
}

func processUserEvent(db *sql.DB, event *client.ChaincodeEvent) {
	var user User
	if err := json.Unmarshal(event.Payload, &user); err != nil {
		log.Printf("⚠️ Failed to parse user payload: %v", err)
		return
	}

	query := `
		INSERT INTO users (id, full_name, identity_number, role, wallet_address, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (id) DO UPDATE SET
			full_name = EXCLUDED.full_name,
			identity_number = EXCLUDED.identity_number,
			role = EXCLUDED.role,
			wallet_address = EXCLUDED.wallet_address,
			updated_at = NOW();
	`
	_, err := db.Exec(query, user.ID, user.FullName, user.IdentityNumber, user.Role, user.WalletAddress)
	if err != nil {
		log.Printf("❌ DB Error (Upsert User): %v", err)
	} else {
		log.Printf("✅ Synced User %s to Postgres", user.ID)
	}
}

func processAssetEvent(db *sql.DB, event *client.ChaincodeEvent) {
	var asset Asset
	if err := json.Unmarshal(event.Payload, &asset); err != nil {
		log.Printf("⚠️ Failed to parse asset payload: %v", err)
		return
	}

	// 1. Upsert into ASSETS table
	query := `
		INSERT INTO assets (id, doc_type, name, asset_type, owner, status, metadata_url, metadata_hash, viewers, last_tx_id, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			asset_type = EXCLUDED.asset_type,
			owner = EXCLUDED.owner,
			status = EXCLUDED.status,
			metadata_url = EXCLUDED.metadata_url,
			metadata_hash = EXCLUDED.metadata_hash,
			viewers = EXCLUDED.viewers,
			last_tx_id = EXCLUDED.last_tx_id,
			updated_at = NOW();
	`
	viewersJSON, _ := json.Marshal(asset.Viewers)
	
	_, err := db.Exec(query, 
		asset.ID, asset.DocType, asset.Name, asset.Type, asset.Owner, 
		asset.Status, asset.MetadataURL, asset.MetadataHash, viewersJSON,
		event.TransactionID,
	)

	if err != nil {
		log.Printf("❌ DB Error (Upsert Asset): %v", err)
		return
	}

	// 2. Insert into HISTORY table
	historyQuery := `
		INSERT INTO asset_history (tx_id, asset_id, action_type, to_owner, block_number, timestamp, asset_snapshot)
		VALUES ($1, $2, $3, $4, $5, NOW(), $6)
	`
	// Map event name to action type
	actionType := strings.ToUpper(strings.Replace(event.EventName, "Asset", "", 1))
	if event.EventName == "AccessGranted" { actionType = "GRANT_ACCESS" }
	if event.EventName == "AccessRevoked" { actionType = "REVOKE_ACCESS" }

	_, err = db.Exec(historyQuery, event.TransactionID, asset.ID, actionType, asset.Owner, event.BlockNumber, event.Payload)

	if err != nil {
		log.Printf("❌ DB Error (Insert History): %v", err)
	} else {
		log.Printf("✅ Synced Asset %s to Postgres", asset.ID)
	}
}

func processDeleteEvent(db *sql.DB, event *client.ChaincodeEvent) {
	assetID := string(event.Payload)
	
	// Delete from Assets table
	_, err := db.Exec("DELETE FROM assets WHERE id = $1", assetID)
	if err != nil {
		log.Printf("❌ DB Error (Delete Asset): %v", err)
	}

	// Add 'Old' record to history
	_, err = db.Exec(`
		INSERT INTO asset_history (tx_id, asset_id, action_type, block_number, timestamp)
		VALUES ($1, $2, 'DELETE', $3, NOW())
	`, event.TransactionID, assetID, event.BlockNumber)

	
	if err == nil {
		log.Printf("🗑️ Deleted Asset %s from Postgres", assetID)
	}
}

// ConnectPostgres helper
func ConnectPostgres(connStr string) (*sql.DB, error) {
	// Retry logic for container startup
	var db *sql.DB
	var err error
	
	for i := 0; i < 5; i++ {
		db, err = sql.Open("postgres", connStr)
		if err == nil {
			err = db.Ping()
			if err == nil {
				return db, nil
			}
		}
		log.Printf("⏳ Waiting for Postgres... (%d/5)", i+1)
		time.Sleep(2 * time.Second)
	}
	return nil, fmt.Errorf("could not connect to postgres: %v", err)
}
