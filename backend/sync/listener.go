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
	ID             string   `json:"ID"`
	DocType        string   `json:"docType"`
	Name           string   `json:"name"`
	Type           string   `json:"type"`
	Owner          string   `json:"owner"`
	Status         string   `json:"status"`
	MetadataURL    string   `json:"metadata_url"`
	MetadataHash   string   `json:"metadata_hash"`
	Viewers        []string `json:"viewers"`
	UpdatedAt      int64    `json:"updatedAt"`
	LastModifiedBy string   `json:"lastModifiedBy"`
	Sequence       uint64   `json:"sequence"`
}

// User structure matching chaincode (No PII)
type User struct {
	ID        string `json:"id"`
	Role      string `json:"role"`
	Status    string `json:"status"`
	UpdatedAt int64  `json:"updatedAt"`
	Sequence  uint64 `json:"sequence"`
}

// PendingTransfer matches chaincode structure
type PendingTransfer struct {
	DocType         string     `json:"docType"` 
	AssetID         string     `json:"asset_id"`
	AssetName       string     `json:"asset_name"`
	CurrentOwner    string     `json:"current_owner"`
	NewOwner        string     `json:"new_owner"`
	Status          string     `json:"status"` 
	CreatedAt       int64      `json:"created_at"`       
	ExpiresAt       int64      `json:"expires_at"`       
	ExecutedAt      int64      `json:"executed_at"`
	RejectionReason string     `json:"rejection_reason"`
}

func (bl *BlockListener) StartEventListening() {
	log.Println("🎧 Starting Chaincode Event Listener...")

	events, err := bl.Network.ChaincodeEvents(context.Background(), bl.Chaincode)
	if err != nil {
		log.Printf("❌ Failed to start event listening: %v", err)
		return
	}

	for event := range events {
		log.Printf("📨 Received Event: %s (Tx: %s, Block: %d)", event.EventName, event.TransactionID, event.BlockNumber)

		switch event.EventName {
		case "AssetCreated", "AssetUpdated", "AccessGranted", "AccessRevoked", "AssetTransferred":
			processAssetEvent(bl.DB, event)
		case "TransferInitiated", "TransferApproved", "TransferExecuted", "TransferRejected":
			processTransferEvent(bl.DB, event)
		case "AssetDeleted":
			processDeleteEvent(bl.DB, event)
		case "UserCreated", "UserStatusUpdated":
			processUserEvent(bl.DB, event)
		default:
			log.Printf("❓ Unknown Event: %s", event.EventName)
		}
	}
}

func processUserEvent(db *sql.DB, event *client.ChaincodeEvent) {
	var user User
	if err := json.Unmarshal(event.Payload, &user); err != nil {
		log.Printf("⚠️ Failed to parse user payload: %v", err)
		return
	}

	// 1. Sequence Check
	var currentSeq uint64
	err := db.QueryRow("SELECT sequence FROM users WHERE id = $1", user.ID).Scan(&currentSeq)
	if err == nil && user.Sequence < currentSeq {
		log.Printf("⚠️ Start Sequence %d < Current %d. Ignoring stale event for User %s", user.Sequence, currentSeq, user.ID)
		return
	}

	// 2. Upsert User (Using Placeholder for PII if Insert)
	// We do NOT update full_name/identity_number on conflict, only Chain state.
	query := `
		INSERT INTO users (id, full_name, identity_number, role, status, updated_at, sequence)
		VALUES ($1, 'Pending Sync', 'Pending', $2, $3, to_timestamp($4), $5)
		ON CONFLICT (id) DO UPDATE SET
			role = EXCLUDED.role,
			status = EXCLUDED.status,
			updated_at = EXCLUDED.updated_at,
			sequence = EXCLUDED.sequence
		WHERE users.sequence < EXCLUDED.sequence;
	`
	
	_, err = db.Exec(query, user.ID, user.Role, user.Status, user.UpdatedAt, user.Sequence)
	if err != nil {
		log.Printf("❌ DB Error (Upsert User): %v", err)
		return
	} 
	log.Printf("✅ Synced User %s to Postgres", user.ID)

	// 3. User History Log
	action := strings.ToUpper(strings.Replace(event.EventName, "User", "", 1)) 
	if event.EventName == "UserCreated" { action = "CREATE" }
	if event.EventName == "UserStatusUpdated" { action = "STATUS_CHANGE" }

	detailsJSON, _ := json.Marshal(map[string]interface{}{
		"status": user.Status,
		"role": user.Role,
	})

	_, err = db.Exec(`
		INSERT INTO user_history (user_id, action, modifier_id, timestamp, details)
		VALUES ($1, $2, 'Chaincode', NOW(), $3)
	`, user.ID, action, detailsJSON)

	if err != nil {
		log.Printf("⚠️ DB Error (History Log): %v", err)
	}
}

func processAssetEvent(db *sql.DB, event *client.ChaincodeEvent) {
	var asset Asset
	if err := json.Unmarshal(event.Payload, &asset); err != nil {
		log.Printf("⚠️ Failed to parse asset payload: %v", err)
		return
	}

	// 1. Sequence Check
	var currentSeq uint64
	err := db.QueryRow("SELECT sequence FROM assets WHERE id = $1", asset.ID).Scan(&currentSeq)
	if err == nil && asset.Sequence < currentSeq {
		log.Printf("⚠️ Stale Asset Event: Seq %d < Current %d for %s", asset.Sequence, currentSeq, asset.ID)
		return
	}

	// 2. Upsert into ASSETS table
	query := `
		INSERT INTO assets (id, doc_type, name, asset_type, owner, status, metadata_url, metadata_hash, viewers, last_tx_id, last_modified_by, updated_at, sequence)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, to_timestamp($12), $13)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			asset_type = EXCLUDED.asset_type,
			owner = EXCLUDED.owner,
			status = EXCLUDED.status,
			metadata_url = EXCLUDED.metadata_url,
			metadata_hash = EXCLUDED.metadata_hash,
			viewers = EXCLUDED.viewers,
			last_tx_id = EXCLUDED.last_tx_id,
			last_modified_by = EXCLUDED.last_modified_by,
			updated_at = EXCLUDED.updated_at,
			sequence = EXCLUDED.sequence
		WHERE assets.sequence < EXCLUDED.sequence;
	`
	viewersJSON, _ := json.Marshal(asset.Viewers)
	
	_, err = db.Exec(query, 
		asset.ID, asset.DocType, asset.Name, asset.Type, asset.Owner, 
		asset.Status, asset.MetadataURL, asset.MetadataHash, viewersJSON,
		event.TransactionID, asset.LastModifiedBy, asset.UpdatedAt, asset.Sequence,
	)

	if err != nil {
		log.Printf("❌ DB Error (Upsert Asset): %v", err)
		return
	}

	// 3. Insert into ASSET_HISTORY table
	historyQuery := `
		INSERT INTO asset_history (tx_id, asset_id, action_type, from_owner, to_owner, block_number, timestamp, actor_id, asset_snapshot)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)
	`
	// Map event name to action type
	actionType := strings.ToUpper(strings.Replace(event.EventName, "Asset", "", 1))
	if event.EventName == "AccessGranted" { actionType = "GRANT_ACCESS" }
	if event.EventName == "AccessRevoked" { actionType = "REVOKE_ACCESS" }

	// For simple logic, we just use current owner as 'to_owner'. 'from_owner' would require previous state query, ignoring for sync simplicity or using DB trigger
	_, err = db.Exec(historyQuery, event.TransactionID, asset.ID, actionType, "", asset.Owner, event.BlockNumber, asset.LastModifiedBy, event.Payload)

	if err != nil {
		log.Printf("❌ DB Error (Insert History): %v", err)
	} else {
		log.Printf("✅ Synced Asset %s to Postgres (Seq: %d)", asset.ID, asset.Sequence)
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
	if err == nil {
		log.Printf("🗑️ Deleted Asset %s from Postgres", assetID)
	}
}

func processTransferEvent(db *sql.DB, event *client.ChaincodeEvent) {
	var pt PendingTransfer
	if err := json.Unmarshal(event.Payload, &pt); err != nil {
		log.Printf("⚠️ Failed to parse PendingTransfer payload: %v", err)
		return
	}

	// We only log history for these events. The actual asset update happens via AssetTransferred event (for Executed)
	// OR via separate AssetUpdated event if implemented that way.
	// But Wait! The chaincode emits AssetTransferred AND TransferExecuted.
	// We should avoid duplicate history.
	
	// If event is TransferExecuted, the AssetTransferred event (which carries the full Asset) 
	// will handle updating the 'assets' table and logging the 'TRANSFER' action.
	// So we might only want to log 'INITIATE_TRANSFER', 'APPROVE_TRANSFER', 'REJECT_TRANSFER' here.
	
	if event.EventName == "TransferExecuted" {
		// We skip this because AssetTransferred should handle the main history record?
		// Actually, TransferExecuted contains the specific multi-sig details.
		// Let's log it anyway as "EXECUTE_TRANSFER"
	}

	actionType := strings.ToUpper(strings.Replace(event.EventName, "Transfer", "", 1))
	if event.EventName == "TransferInitiated" { actionType = "INITIATE_TRANSFER" }
	
	// Insert into ASSET_HISTORY
	historyQuery := `
		INSERT INTO asset_history (tx_id, asset_id, action_type, from_owner, to_owner, block_number, timestamp, actor_id, asset_snapshot)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'Chaincode', $7)
	`
	// We don't easily know who the 'actor' is from the event payload without complex parsing
	// So we set actor_id = 'Chaincode' or 'MultiSig'
	// We have lastModifiedBy so why it hard to set actor_id = lastModifiedBy?
	_, err := db.Exec(historyQuery, event.TransactionID, pt.AssetID, actionType, pt.CurrentOwner, pt.NewOwner, event.BlockNumber, event.Payload)

	if err != nil {
		log.Printf("❌ DB Error (Transfer History): %v", err)
	} else {
		log.Printf("✅ Logged Transfer Event %s for Asset %s", actionType, pt.AssetID)
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
