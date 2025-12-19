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
	DocType      string   `json:"docType"` // docType is used to distinguish the various types of objects in state database
	ID           string   `json:"ID"`
	Name         string   `json:"name"`   // Product Name (e.g., "MacBook Pro")
	Type         string   `json:"type"`   // Category (e.g., "Electronics", "RealEstate")
	Owner        string   `json:"owner"`        // Current Owner
	Status       string   `json:"status"`        // Status (e.g., "Available", "Sold", "Locked")
	MetadataURL  string   `json:"metadata_url"`  // External Metadata (e.g. IPFS hash)
	MetadataHash string   `json:"metadata_hash"` // Integrity Check (SHA-256)
	Viewers      []string `json:"viewers"`       // List of distinct UserIDs allowed to view. "EVERYONE" for public.
}

// User describes the participant in the network
type User struct {
	DocType        string `json:"docType"`
	ID             string `json:"id"`
	FullName       string `json:"full_name"`
	IdentityNumber string `json:"identity_number"` // CCCD/Passport
	WalletAddress  string `json:"wallet_address"`  // Optional: For future non-custodial features
	Role           string `json:"role"`            // Admin, User, Auditor
}

// HistoryQueryResult structure used for returning result of history query
type HistoryQueryResult struct {
	TxId      string `json:"txId"`
	Timestamp string `json:"timestamp"`
	Record    *Asset `json:"record"`
	IsDelete  bool   `json:"isDelete"`
}

// InitLedger adds a base set of assets to the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	assets := []Asset{
		{DocType: "asset", ID: "asset1", Name: "iPhone 15 Pro", Type: "Electronics", Owner: "Tomoko", Status: "Available", MetadataURL: "http://example.com/asset1.json", MetadataHash: "hash_asset1", Viewers: []string{"EVERYONE"}},
		{DocType: "asset", ID: "asset2", Name: "Tesla Model S", Type: "Vehicle", Owner: "Brad", Status: "Available", MetadataURL: "http://example.com/asset2.json", MetadataHash: "hash_asset2", Viewers: []string{}},
		{DocType: "asset", ID: "asset3", Name: "Penthouse Suite", Type: "RealEstate", Owner: "JinSoo", Status: "Owned", MetadataURL: "http://example.com/asset3.json", MetadataHash: "hash_asset3", Viewers: []string{"auditor"}},
		{DocType: "asset", ID: "asset4", Name: "Gold Bar 1kg", Type: "PreciousMetal", Owner: "Max", Status: "Locked", MetadataURL: "http://example.com/asset4.json", MetadataHash: "hash_asset4", Viewers: []string{}},
		{DocType: "asset", ID: "asset5", Name: "Antique Vase", Type: "Art", Owner: "Adriana", Status: "Available", MetadataURL: "http://example.com/asset5.json", MetadataHash: "hash_asset5", Viewers: []string{"Tomoko"}},
		{DocType: "asset", ID: "asset6", Name: "Bitcoin", Type: "Crypto", Owner: "Michel", Status: "Available", MetadataURL: "http://example.com/asset6.json", MetadataHash: "hash_asset6", Viewers: []string{"EVERYONE"}},
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

	// Seed Default Users
	users := []User{
		{DocType: "user", ID: "user01", FullName: "User One", IdentityNumber: "ID001", Role: "User"},
		{DocType: "user", ID: "Tomoko", FullName: "Tomoko", IdentityNumber: "ID002", Role: "User"},
		{DocType: "user", ID: "Brad", FullName: "Brad", IdentityNumber: "ID003", Role: "User"},
		{DocType: "user", ID: "JinSoo", FullName: "Jin Soo", IdentityNumber: "ID004", Role: "User"},
		{DocType: "user", ID: "Max", FullName: "Max", IdentityNumber: "ID005", Role: "User"},
		{DocType: "user", ID: "Adriana", FullName: "Adriana", IdentityNumber: "ID006", Role: "User"},
		{DocType: "user", ID: "Michel", FullName: "Michel", IdentityNumber: "ID007", Role: "User"},
		{DocType: "user", ID: "admin", FullName: "System Admin", IdentityNumber: "ID000", Role: "Admin"},
		{DocType: "user", ID: "auditor", FullName: "Auditor One", IdentityNumber: "ID999", Role: "Auditor"},
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

	asset := Asset{
		DocType:      "asset",
		ID:           id,
		Name:         name,
		Type:         assetType,
		Owner:        owner,
		Status:       status,
		MetadataURL:  metadataUrl,
		MetadataHash: metadataHash,
		Viewers:      []string{}, // Default: Private to Owner
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

	asset := Asset{
		DocType:      "asset",
		ID:           id,
		Name:         name,
		Type:         assetType,
		Owner:        owner,
		Status:       status,
		MetadataURL:  metadataUrl,
		MetadataHash: metadataHash,
		Viewers:      oldAsset.Viewers,
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

	asset.Viewers = append(asset.Viewers, viewerId)
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

	asset.Viewers = newViewers
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


// TransferAsset updates the owner field of asset with given id in world state.
func (s *SmartContract) TransferAsset(ctx contractapi.TransactionContextInterface, id string, newOwner string) error {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return err
	}

	// Optional: Add logic here (e.g., check if Status == "Available" before transfer)
	// For now, we allow transfer regardless of status, but we could enforce it.
	// if asset.Status != "Available" { return fmt.Errorf("Asset is %s, cannot transfer", asset.Status) }

	asset.Owner = newOwner
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

// CreateUser registers a new user in the system
func (s *SmartContract) CreateUser(ctx contractapi.TransactionContextInterface, id string, fullName string, identityNumber string, role string) error {
	// Check if user already exists
	userJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return fmt.Errorf("failed to read from world state: %v", err)
	}
	if userJSON != nil {
		return fmt.Errorf("the user %s already exists", id)
	}

	user := User{
		ID:             id,
		FullName:       fullName,
		IdentityNumber: identityNumber,
		Role:           role,
		WalletAddress:  "", // Empty for now
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
