package chaincode

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing an Asset
type SmartContract struct {
	contractapi.Contract
}

// NewSmartContract returns a new SmartContract
func NewSmartContract() (*SmartContract, error) {
	return &SmartContract{}, nil
}

// Asset describes basic details of what makes up a simple asset
// Adjusted for generic commercial transactions (Product X)
type Asset struct {
	DocType        string   `json:"docType"` // docType is used to distinguish the various types of objects in state database
	ID             string   `json:"ID"`
	Name           string   `json:"name"`          // Product Name (e.g., "MacBook Pro")
	Type           string   `json:"type"`          // Category (e.g., "Electronics", "RealEstate")
	Owner          string   `json:"owner"`         // Current Owner
	Status         string   `json:"status"`        // Status (e.g., "Available", "Sold", "Locked")
	MetadataURL    string   `json:"metadata_url"`  // External Metadata (e.g. IPFS hash)
	MetadataHash   string   `json:"metadata_hash"` // Integrity Check (SHA-256)
	Viewers        []string `json:"viewers"`       // List of distinct UserIDs allowed to view. "EVERYONE" for public.
	UpdatedAt      int64    `json:"updatedAt"`     // Timestamp of last update
	LastModifiedBy string   `json:"lastModifiedBy"` // Provenance: Who made the last change
	Sequence       uint64   `json:"sequence"`      // Eventual Consistency Check
}

// User describes the participant in the network
type User struct {
	DocType   string `json:"docType"`
	ID        string `json:"id"`
	Role      string `json:"role"`      // Admin, User, Auditor
	Status    string `json:"status"`    // Active, Locked
	UpdatedAt int64  `json:"updatedAt"` // Timestamp of last update
	Sequence  uint64 `json:"sequence"`  // For eventual consistency checks
}

// ... existing code ...

// SetUserStatus updates the status of a user (e.g. "Locked" or "Active")
func (s *SmartContract) SetUserStatus(ctx contractapi.TransactionContextInterface, targetUserID string, newStatus string, adminID string) error {
	// 1. Verify Admin (Caller)
	// Ideally we check Client Identity here, but passing adminID for simulation/logging consistency
	
	// 2. Get Target User
	user, err := s.ReadUser(ctx, targetUserID)
	if err != nil {
		return err
	}

	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}

	// 3. Update Status
	user.Status = newStatus
	user.UpdatedAt = timestamp.Seconds
	user.Sequence = user.Sequence + 1
	
	userBytes, err := json.Marshal(user)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(targetUserID, userBytes)
	if err != nil {
		return err
	}

	return ctx.GetStub().SetEvent("UserStatusUpdated", userBytes)
}

// HistoryQueryResult structure used for returning result of history query
type HistoryQueryResult struct {
	TxId      string `json:"txId"`
	Timestamp string `json:"timestamp"`
	Record    *Asset `json:"record"`
	IsDelete  bool   `json:"isDelete"`
}

// PendingTransfer represents a transfer awaiting multi-signature approval
type PendingTransfer struct {
	DocType         string     `json:"docType"` // "pending_transfer"
	AssetID         string     `json:"asset_id"`
	AssetName       string     `json:"asset_name"`
	CurrentOwner    string     `json:"current_owner"`
	NewOwner        string     `json:"new_owner"`
	Status          string     `json:"status"` // PENDING, EXECUTED, REJECTED, EXPIRED
	Approvals       []Approval `json:"approvals"`
	CreatedAt       int64      `json:"created_at"`       // Unix timestamp
	ExpiresAt       int64      `json:"expires_at"`       // Unix timestamp (24h from creation)
	ExecutedAt      int64      `json:"executed_at"`
	RejectionReason string     `json:"rejection_reason"`
}

// Approval represents a single signature on a pending transfer
type Approval struct {
	Signer    string `json:"signer"`
	Role      string `json:"role"`      // CURRENT_OWNER or NEW_OWNER
	Timestamp int64  `json:"timestamp"` // Unix timestamp
	Comment   string `json:"comment,omitempty"`
}


// InitLedger adds a base set of assets to the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	// timestamp approximation for init
	timestamp, _ := ctx.GetStub().GetTxTimestamp()
	ts := timestamp.Seconds

	assets := []Asset{
		{DocType: "asset", ID: "asset1", Name: "iPhone 15 Pro", Type: "Electronics", Owner: "Tomoko", Status: "Available", MetadataURL: "http://example.com/asset1.json", MetadataHash: "hash_asset1", Viewers: []string{"EVERYONE"}, UpdatedAt: ts, LastModifiedBy: "System", Sequence: 1},
		{DocType: "asset", ID: "asset2", Name: "Tesla Model S", Type: "Vehicle", Owner: "Brad", Status: "Available", MetadataURL: "http://example.com/asset2.json", MetadataHash: "hash_asset2", Viewers: []string{}, UpdatedAt: ts, LastModifiedBy: "System", Sequence: 1},
		{DocType: "asset", ID: "asset3", Name: "Penthouse Suite", Type: "RealEstate", Owner: "JinSoo", Status: "Owned", MetadataURL: "http://example.com/asset3.json", MetadataHash: "hash_asset3", Viewers: []string{"auditor"}, UpdatedAt: ts, LastModifiedBy: "System", Sequence: 1},
		{DocType: "asset", ID: "asset4", Name: "Gold Bar 1kg", Type: "PreciousMetal", Owner: "Max", Status: "Locked", MetadataURL: "http://example.com/asset4.json", MetadataHash: "hash_asset4", Viewers: []string{}, UpdatedAt: ts, LastModifiedBy: "System", Sequence: 1},
		{DocType: "asset", ID: "asset5", Name: "Antique Vase", Type: "Art", Owner: "Adriana", Status: "Available", MetadataURL: "http://example.com/asset5.json", MetadataHash: "hash_asset5", Viewers: []string{"Tomoko"}, UpdatedAt: ts, LastModifiedBy: "System", Sequence: 1},
		{DocType: "asset", ID: "asset6", Name: "Bitcoin", Type: "Crypto", Owner: "Michel", Status: "Available", MetadataURL: "http://example.com/asset6.json", MetadataHash: "hash_asset6", Viewers: []string{"EVERYONE"}, UpdatedAt: ts, LastModifiedBy: "System", Sequence: 1},
	}

	for _, asset := range assets {
		assetJSON, err := json.Marshal(asset)
		if err != nil {
			return err
		}

		err = ctx.GetStub().PutState(asset.ID, assetJSON)
		if err != nil {
			return fmt.Errorf("failed to put to world state. %v", err)
		}
	}

	// Seed Default Users (PII removed)
	users := []User{
		{DocType: "user", ID: "user01", Role: "User", Status: "Active", UpdatedAt: ts, Sequence: 1},
		{DocType: "user", ID: "Tomoko", Role: "User", Status: "Active", UpdatedAt: ts, Sequence: 1},
		{DocType: "user", ID: "Brad", Role: "User", Status: "Active", UpdatedAt: ts, Sequence: 1},
		{DocType: "user", ID: "JinSoo", Role: "User", Status: "Active", UpdatedAt: ts, Sequence: 1},
		{DocType: "user", ID: "Max", Role: "User", Status: "Active", UpdatedAt: ts, Sequence: 1},
		{DocType: "user", ID: "Adriana", Role: "User", Status: "Active", UpdatedAt: ts, Sequence: 1},
		{DocType: "user", ID: "Michel", Role: "User", Status: "Active", UpdatedAt: ts, Sequence: 1},
		{DocType: "user", ID: "admin", Role: "Admin", Status: "Active", UpdatedAt: ts, Sequence: 1},
		{DocType: "user", ID: "auditor", Role: "Auditor", Status: "Active", UpdatedAt: ts, Sequence: 1},
	}

	for _, user := range users {
		userJSON, err := json.Marshal(user)
		if err != nil {
			return err
		}
		err = ctx.GetStub().PutState(user.ID, userJSON)
		if err != nil {
			return fmt.Errorf("failed to put user to world state. %v", err)
		}
	}

	return nil
}

// CreateAsset issues a new asset to the world state with given details.
func (s *SmartContract) CreateAsset(ctx contractapi.TransactionContextInterface, id string, name string, assetType string, owner string, status string, metadataUrl string, metadataHash string) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the asset %s already exists", id)
	}

	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}
	// In a real scenario, we might use the submitter's ID
	rawID, _ := ctx.GetClientIdentity().GetID()
	submitterID := extractUsername(rawID)

	asset := Asset{
		DocType:        "asset",
		ID:             id,
		Name:           name,
		Type:           assetType,
		Owner:          owner,
		Status:         status,
		MetadataURL:    metadataUrl,
		MetadataHash:   metadataHash,
		Viewers:        []string{}, // Default: Private to Owner
		UpdatedAt:      timestamp.Seconds,
		LastModifiedBy: submitterID,
		Sequence:       1,
	}
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(id, assetJSON)
	if err != nil {
		return err
	}
	// Emit Event for Sync
	return ctx.GetStub().SetEvent("AssetCreated", assetJSON)
}


// ReadAsset returns the asset stored in the world state with given id.
func (s *SmartContract) ReadAsset(ctx contractapi.TransactionContextInterface, id string) (*Asset, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if assetJSON == nil {
		return nil, fmt.Errorf("the asset %s does not exist", id)
	}

	var asset Asset
	err = json.Unmarshal(assetJSON, &asset)
	if err != nil {
		return nil, err
	}

	return &asset, nil
}

// UpdateAsset updates an existing asset in the world state with provided parameters.
func (s *SmartContract) UpdateAsset(ctx contractapi.TransactionContextInterface, id string, name string, assetType string, owner string, status string, metadataUrl string, metadataHash string) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the asset %s does not exist", id)
	}

	// We need to preserve existing Viewers, so read first
	oldAsset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return err
	}

	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}
	rawID, _ := ctx.GetClientIdentity().GetID()
	submitterID := extractUsername(rawID)

	asset := Asset{
		DocType:        "asset",
		ID:             id,
		Name:           name,
		Type:           assetType,
		Owner:          owner,
		Status:         status,
		MetadataURL:    metadataUrl,
		MetadataHash:   metadataHash,
		Viewers:        oldAsset.Viewers,
		UpdatedAt:      timestamp.Seconds,
		LastModifiedBy: submitterID,
		Sequence:       oldAsset.Sequence + 1,
	}
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(id, assetJSON)
	if err != nil {
		return err
	}
	return ctx.GetStub().SetEvent("AssetUpdated", assetJSON)
}


// DeleteAsset deletes an given asset from the world state.
func (s *SmartContract) DeleteAsset(ctx contractapi.TransactionContextInterface, id string) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the asset %s does not exist", id)
	}

	err = ctx.GetStub().DelState(id)
	if err != nil {
		return err
	}
	// Event payload is just the ID for deletion
	return ctx.GetStub().SetEvent("AssetDeleted", []byte(id))
}


// AssetExists returns true when asset with given ID exists in world state
func (s *SmartContract) AssetExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return assetJSON != nil, nil
}

// GrantAccess adds a viewer to the asset
func (s *SmartContract) GrantAccess(ctx contractapi.TransactionContextInterface, id string, viewerId string) error {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return err
	}

	// Check for duplicates
	for _, v := range asset.Viewers {
		if v == viewerId {
			return nil // Already granted
		}
	}

	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}
	rawID, _ := ctx.GetClientIdentity().GetID()
	submitterID := extractUsername(rawID)

	asset.Viewers = append(asset.Viewers, viewerId)
	asset.UpdatedAt = timestamp.Seconds
	asset.LastModifiedBy = submitterID
	asset.Sequence = asset.Sequence + 1

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(id, assetJSON)
	if err != nil {
		return err
	}
	return ctx.GetStub().SetEvent("AccessGranted", assetJSON)
}


// RevokeAccess removes a viewer from the asset
func (s *SmartContract) RevokeAccess(ctx contractapi.TransactionContextInterface, id string, viewerId string) error {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return err
	}

	newViewers := []string{}
	for _, v := range asset.Viewers {
		if v != viewerId {
			newViewers = append(newViewers, v)
		}
	}

	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}
	rawID, _ := ctx.GetClientIdentity().GetID()
	submitterID := extractUsername(rawID)

	asset.Viewers = newViewers
	asset.UpdatedAt = timestamp.Seconds
	asset.LastModifiedBy = submitterID
	asset.Sequence = asset.Sequence + 1

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(id, assetJSON)
	if err != nil {
		return err
	}
	return ctx.GetStub().SetEvent("AccessRevoked", assetJSON)
}

// ========== MULTI-SIGNATURE TRANSFER FUNCTIONS ==========

// InitiateTransfer creates a pending transfer requiring 2-party approval
func (s *SmartContract) InitiateTransfer(ctx contractapi.TransactionContextInterface, assetID string, newOwner string, initiatorID string) error {
	// Get the asset
	asset, err := s.ReadAsset(ctx, assetID)
	if err != nil {
		return fmt.Errorf("asset not found: %v", err)
	}

	// Verify initiator is current owner
	if asset.Owner != initiatorID {
		return fmt.Errorf("only asset owner can initiate transfer. Owner: %s, Initiator: %s", asset.Owner, initiatorID)
	}

	// Cannot transfer to self
	if newOwner == initiatorID {
		return fmt.Errorf("cannot transfer asset to yourself")
	}

	// Check if pending transfer already exists
	pendingKey := fmt.Sprintf("PENDING_TRANSFER_%s", assetID)
	existingBytes, err := ctx.GetStub().GetState(pendingKey)
	if err == nil && existingBytes != nil {
		var existing PendingTransfer
		json.Unmarshal(existingBytes, &existing)
		if existing.Status == "PENDING" {
			return fmt.Errorf("a pending transfer already exists for this asset")
		}
	}

	// Create pending transfer with auto-approval from initiator
	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	now := timestamp.Seconds
	
	pendingTransfer := PendingTransfer{
		DocType:      "pending_transfer",
		AssetID:      assetID,
		AssetName:    asset.Name,
		CurrentOwner: initiatorID,
		NewOwner:     newOwner,
		Status:       "PENDING",
		Approvals: []Approval{
			{
				Signer:    initiatorID,
				Role:      "CURRENT_OWNER",
				Timestamp: now,
				Comment:   "Initiated transfer",
			},
		},
		CreatedAt: now,
		ExpiresAt: now + 86400, // 24 hours in seconds
	}

	// Store pending transfer on blockchain
	pendingJSON, err := json.Marshal(pendingTransfer)
	if err != nil {
		return fmt.Errorf("failed to marshal pending transfer: %v", err)
	}

	err = ctx.GetStub().PutState(pendingKey, pendingJSON)
	if err != nil {
		return fmt.Errorf("failed to store pending transfer: %v", err)
	}

	// Emit event
	ctx.GetStub().SetEvent("TransferInitiated", pendingJSON)

	return nil
}

// ApproveTransfer approves a pending transfer and executes if 2/2 signatures collected
func (s *SmartContract) ApproveTransfer(ctx contractapi.TransactionContextInterface, assetID string, approverID string) error {
	// Get pending transfer
	pendingKey := fmt.Sprintf("PENDING_TRANSFER_%s", assetID)
	pendingBytes, err := ctx.GetStub().GetState(pendingKey)
	if err != nil || pendingBytes == nil {
		return fmt.Errorf("pending transfer not found for asset: %s", assetID)
	}

	var pending PendingTransfer
	err = json.Unmarshal(pendingBytes, &pending)
	if err != nil {
		return fmt.Errorf("failed to unmarshal pending transfer: %v", err)
	}

	// Check expiration
	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	now := timestamp.Seconds
	
	if now > pending.ExpiresAt {
		pending.Status = "EXPIRED"
		pendingJSON, _ := json.Marshal(pending)
		ctx.GetStub().PutState(pendingKey, pendingJSON)
		ctx.GetStub().SetEvent("TransferExpired", pendingJSON)
		return fmt.Errorf("transfer request has expired")
	}

	// Check if already executed/rejected
	if pending.Status != "PENDING" {
		return fmt.Errorf("transfer is no longer pending. Status: %s", pending.Status)
	}

	// Verify approver is the new owner (recipient)
	if approverID != pending.NewOwner {
		return fmt.Errorf("only the recipient can approve. Expected: %s, Got: %s", pending.NewOwner, approverID)
	}

	// Check if already approved by this user
	for _, approval := range pending.Approvals {
		if approval.Signer == approverID {
			return fmt.Errorf("you have already approved this transfer")
		}
	}

	// Add approval
	pending.Approvals = append(pending.Approvals, Approval{
		Signer:    approverID,
		Role:      "NEW_OWNER",
		Timestamp: now,
		Comment:   "Approved transfer",
	})

	// Check if we have 2 approvals - EXECUTE TRANSFER
	if len(pending.Approvals) >= 2 {
		// Re-read asset to verify ownership hasn't changed
		asset, err := s.ReadAsset(ctx, assetID)
		if err != nil {
			pending.Status = "INVALID"
			pendingJSON, _ := json.Marshal(pending)
			ctx.GetStub().PutState(pendingKey, pendingJSON)
			return fmt.Errorf("asset no longer exists: %v", err)
		}

		// Verify current owner matches pending transfer
		if asset.Owner != pending.CurrentOwner {
			pending.Status = "INVALID"
			pendingJSON, _ := json.Marshal(pending)
			ctx.GetStub().PutState(pendingKey, pendingJSON)
			return fmt.Errorf("asset owner has changed. Expected: %s, Current: %s", pending.CurrentOwner, asset.Owner)
		}

		// ATOMIC TRANSFER EXECUTION
		// Update UpdatedAt, LastModifiedBy, Sequence
		rawID, _ := ctx.GetClientIdentity().GetID()
		submitterID := extractUsername(rawID)
		asset.Owner = pending.NewOwner
		asset.UpdatedAt = now // 'now' is already defined from Timestamp
		asset.LastModifiedBy = submitterID // Usually the new owner executing
		asset.Sequence = asset.Sequence + 1

		assetJSON, err := json.Marshal(asset)
		if err != nil {
			return fmt.Errorf("failed to marshal asset: %v", err)
		}

		err = ctx.GetStub().PutState(assetID, assetJSON)
		if err != nil {
			return fmt.Errorf("failed to update asset ownership: %v", err)
		}

		// Mark pending transfer as executed
		pending.Status = "EXECUTED"
		pending.ExecutedAt = now

		// Emit transfer event
		ctx.GetStub().SetEvent("AssetTransferred", assetJSON)

		// Delete pending transfer (cleanup)
		err = ctx.GetStub().DelState(pendingKey)
		if err != nil {
			return fmt.Errorf("failed to delete pending transfer: %v", err)
		}

		// Emit execution event
		executedJSON, _ := json.Marshal(pending)
		ctx.GetStub().SetEvent("TransferExecuted", executedJSON)

		return nil
	}

	// Not enough approvals yet, update pending transfer
	pendingJSON, err := json.Marshal(pending)
	if err != nil {
		return fmt.Errorf("failed to marshal pending transfer: %v", err)
	}

	err = ctx.GetStub().PutState(pendingKey, pendingJSON)
	if err != nil {
		return fmt.Errorf("failed to update pending transfer: %v", err)
	}

	// Emit approval event
	ctx.GetStub().SetEvent("TransferApproved", pendingJSON)

	return nil
}

// RejectTransfer rejects a pending transfer
func (s *SmartContract) RejectTransfer(ctx contractapi.TransactionContextInterface, assetID string, reason string, rejectorID string) error {
	// Get pending transfer
	pendingKey := fmt.Sprintf("PENDING_TRANSFER_%s", assetID)
	pendingBytes, err := ctx.GetStub().GetState(pendingKey)
	if err != nil || pendingBytes == nil {
		return fmt.Errorf("pending transfer not found for asset: %s", assetID)
	}

	var pending PendingTransfer
	err = json.Unmarshal(pendingBytes, &pending)
	if err != nil {
		return fmt.Errorf("failed to unmarshal pending transfer: %v", err)
	}

	// Check if already executed/rejected
	if pending.Status != "PENDING" {
		return fmt.Errorf("transfer is no longer pending. Status: %s", pending.Status)
	}

	// Verify rejector is involved (either current owner or new owner)
	if rejectorID != pending.CurrentOwner && rejectorID != pending.NewOwner {
		return fmt.Errorf("only involved parties can reject. Rejector: %s", rejectorID)
	}

	// Mark as rejected
	pending.Status = "REJECTED"
	pending.RejectionReason = reason

	pendingJSON, err := json.Marshal(pending)
	if err != nil {
		return fmt.Errorf("failed to marshal pending transfer: %v", err)
	}

	// Update state (keep for audit trail)
	err = ctx.GetStub().PutState(pendingKey, pendingJSON)
	if err != nil {
		return fmt.Errorf("failed to update pending transfer: %v", err)
	}

	// Emit rejection event
	ctx.GetStub().SetEvent("TransferRejected", pendingJSON)

	return nil
}

// GetPendingTransfer retrieves a pending transfer by asset ID
func (s *SmartContract) GetPendingTransfer(ctx contractapi.TransactionContextInterface, assetID string) (*PendingTransfer, error) {
	pendingKey := fmt.Sprintf("PENDING_TRANSFER_%s", assetID)
	pendingBytes, err := ctx.GetStub().GetState(pendingKey)
	if err != nil {
		return nil, fmt.Errorf("failed to read pending transfer: %v", err)
	}
	if pendingBytes == nil {
		return nil, fmt.Errorf("pending transfer not found for asset: %s", assetID)
	}

	var pending PendingTransfer
	err = json.Unmarshal(pendingBytes, &pending)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal pending transfer: %v", err)
	}

	return &pending, nil
}

// GetAllPendingTransfers returns all pending transfers
func (s *SmartContract) GetAllPendingTransfers(ctx contractapi.TransactionContextInterface) ([]*PendingTransfer, error) {
	// Use GetStateByRange to find all keys starting with PENDING_TRANSFER_
	startKey := "PENDING_TRANSFER_"
	endKey := "PENDING_TRANSFER_\uffff"
	
	resultsIterator, err := ctx.GetStub().GetStateByRange(startKey, endKey)
	if err != nil {
		return nil, fmt.Errorf("failed to get pending transfers: %v", err)
	}
	defer resultsIterator.Close()

	var pendingTransfers []*PendingTransfer
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var pending PendingTransfer
		err = json.Unmarshal(queryResponse.Value, &pending)
		if err != nil {
			continue
		}

		// Only return PENDING status
		if pending.Status == "PENDING" {
			pendingTransfers = append(pendingTransfers, &pending)
		}
	}

	return pendingTransfers, nil
}

// Helper function to extract username from client ID
func extractUsername(clientID string) string {
	// Client ID format: x509::/CN=username::OU=client::...
	// Extract the CN (Common Name) which is the username
	start := len("x509::/CN=")
	end := len(clientID)
	for i := start; i < len(clientID); i++ {
		if clientID[i] == ':' {
			end = i
			break
		}
	}
	if end > start && end <= len(clientID) {
		return clientID[start:end]
	}
	return clientID // Fallback to full ID if parsing fails
}


// TransferAsset updates the owner field of asset with given id in world state.
// NOTE: This function is now DEPRECATED in favor of multi-sig transfers
// It remains for backward compatibility and admin override scenarios

func (s *SmartContract) TransferAsset(ctx contractapi.TransactionContextInterface, id string, newOwner string) error {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return err
	}

	// Optional: Add logic here (e.g., check if Status == "Available" before transfer)
	// For now, we allow transfer regardless of status, but we could enforce it.
	// if asset.Status != "Available" { return fmt.Errorf("Asset is %s, cannot transfer", asset.Status) }

	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}
	rawID, _ := ctx.GetClientIdentity().GetID()
	submitterID := extractUsername(rawID)

	asset.Owner = newOwner
	asset.UpdatedAt = timestamp.Seconds
	asset.LastModifiedBy = submitterID
	asset.Sequence = asset.Sequence + 1

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(id, assetJSON)
	if err != nil {
		return err
	}
	return ctx.GetStub().SetEvent("AssetTransferred", assetJSON)
}


// GetAllAssets returns all assets found in world state
func (s *SmartContract) GetAllAssets(ctx contractapi.TransactionContextInterface) ([]*Asset, error) {
	// range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var assets []*Asset
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var asset Asset
		err = json.Unmarshal(queryResponse.Value, &asset)
		if err != nil {
			return nil, err
		}
		
		// FILTER: Only return records where DocType is "asset"
		if asset.DocType == "asset" {
			assets = append(assets, &asset)
		}
	}
	return assets, nil
}

// CreateUser registers a new user in the system (On-Chain Identity only)
func (s *SmartContract) CreateUser(ctx contractapi.TransactionContextInterface, id string, role string) error {
	// Check if user already exists
	userJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return fmt.Errorf("failed to read from world state: %v", err)
	}
	if userJSON != nil {
		return fmt.Errorf("the user %s already exists", id)
	}

	timestamp, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return err
	}

	user := User{
		DocType:   "user",
		ID:        id,
		Role:      role,
		Status:    "Active",
		UpdatedAt: timestamp.Seconds,
		Sequence:  1,
	}
	
	userBytes, err := json.Marshal(user)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(id, userBytes)
	if err != nil {
		return err
	}
	return ctx.GetStub().SetEvent("UserCreated", userBytes)
}


// ReadUser returns the user stored in the world state with given id.
func (s *SmartContract) ReadUser(ctx contractapi.TransactionContextInterface, id string) (*User, error) {
	userJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if userJSON == nil {
		return nil, fmt.Errorf("the user %s does not exist", id)
	}

	var user User
	err = json.Unmarshal(userJSON, &user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// GetAssetHistory returns the chain of custody for an asset since issuance.
func (s *SmartContract) GetAssetHistory(ctx contractapi.TransactionContextInterface, assetID string) ([]HistoryQueryResult, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(assetID)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []HistoryQueryResult
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var asset Asset
		if len(response.Value) > 0 {
			err = json.Unmarshal(response.Value, &asset)
			if err != nil {
				return nil, err
			}
		} else {
			asset = Asset{ID: assetID}
		}

		timestamp := response.Timestamp.AsTime().String()

		record := HistoryQueryResult{
			TxId:      response.TxId,
			Timestamp: timestamp,
			Record:    &asset,
			IsDelete:  response.IsDelete,
		}
		records = append(records, record)
	}

	return records, nil
}
