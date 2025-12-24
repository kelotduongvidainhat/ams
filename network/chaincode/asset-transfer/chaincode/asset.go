package chaincode

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Asset describes basic details of what makes up a simple asset
// Adjusted for generic commercial transactions (Product X)
type Asset struct {
	DocType      string   `json:"docType"` // docType is used to distinguish the various types of objects in state database
	ID           string   `json:"ID"`
	Name         string   `json:"name"`   // Product Name (e.g., "MacBook Pro")
	Type         string   `json:"type"`   // Category (e.g., "Electronics", "RealEstate")
	Owner        string   `json:"owner"`        // Current Owner
	Status       string   `json:"status"`        // Status (e.g., "Available", "Sold", "Locked", "For Sale")
	MetadataURL  string   `json:"metadata_url"`  // External Metadata (e.g. IPFS hash)
	MetadataHash string   `json:"metadata_hash"` // Integrity Check (SHA-256)
	Viewers      []string `json:"viewers"`       // List of distinct UserIDs allowed to view. "EVERYONE" for public.
	Price        float64  `json:"price"`         // Market Price (if For Sale)
	Currency     string   `json:"currency"`      // Currency code (e.g., "USD", "AMS")
}

// HistoryQueryResult structure used for returning result of history query
type HistoryQueryResult struct {
	TxId      string `json:"txId"`
	Timestamp string `json:"timestamp"`
	Record    *Asset `json:"record"`
	IsDelete  bool   `json:"isDelete"`
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

	// Verify Authorization
	clientID, err := s.getSubmittingClientIdentity(ctx)
	if err != nil {
		return err
	}
	if owner != clientID {
		return fmt.Errorf("assets can only be created by their owner. Owner: %s, Signer: %s", owner, clientID)
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
	
	// Check Lock Status
	if oldAsset.Status == "Locked" {
		return fmt.Errorf("asset is locked and cannot be updated")
	}

	// Verify Ownership
	clientID, err := s.getSubmittingClientIdentity(ctx)
	if err != nil {
		return err
	}
	if oldAsset.Owner != clientID {
		return fmt.Errorf("only the asset owner can update it. Owner: %s, Signer: %s", oldAsset.Owner, clientID)
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

// TransferAsset updates the owner field of asset with given id in world state.
// NOTE: This function is now DEPRECATED in favor of multi-sig transfers
// It remains for backward compatibility and admin override scenarios
func (s *SmartContract) TransferAsset(ctx contractapi.TransactionContextInterface, id string, newOwner string) error {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return err
	}

	// Check Lock Status
	if asset.Status == "Locked" {
		return fmt.Errorf("asset is locked and cannot be transferred")
	}

	// Verify Ownership
	clientID, err := s.getSubmittingClientIdentity(ctx)
	if err != nil {
		return err
	}
	if asset.Owner != clientID {
		return fmt.Errorf("only the asset owner can transfer it. Owner: %s, Signer: %s", asset.Owner, clientID)
	}

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

// LockAsset allows the admin to freeze an asset
func (s *SmartContract) LockAsset(ctx contractapi.TransactionContextInterface, assetID string) error {
	// Verify Admin
	clientID, err := s.getSubmittingClientIdentity(ctx)
	if err != nil {
		return err
	}
	if clientID != "admin" && clientID != "Admin@org1.example.com" {
		return fmt.Errorf("only admin can lock assets. Signer: %s", clientID)
	}

	asset, err := s.ReadAsset(ctx, assetID)
	if err != nil {
		return err
	}

	asset.Status = "Locked"
	
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(assetID, assetJSON)
	if err != nil {
		return err
	}
	return ctx.GetStub().SetEvent("AssetLocked", assetJSON)
}

// UnlockAsset allows the admin to unfreeze an asset
func (s *SmartContract) UnlockAsset(ctx contractapi.TransactionContextInterface, assetID string) error {
	// Verify Admin
	clientID, err := s.getSubmittingClientIdentity(ctx)
	if err != nil {
		return err
	}
	if clientID != "admin" && clientID != "Admin@org1.example.com" {
		return fmt.Errorf("only admin can unlock assets. Signer: %s", clientID)
	}

	asset, err := s.ReadAsset(ctx, assetID)
	if err != nil {
		return err
	}

	asset.Status = "Available" // Default to Available when unlocked
	
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(assetID, assetJSON)
	if err != nil {
		return err
	}
	return ctx.GetStub().SetEvent("AssetUnlocked", assetJSON)
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
