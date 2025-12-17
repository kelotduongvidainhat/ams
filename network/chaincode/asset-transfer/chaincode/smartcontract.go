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
	ID     string `json:"ID"`
	Name   string `json:"name"`   // Product Name (e.g., "MacBook Pro")
	Type   string `json:"type"`   // Category (e.g., "Electronics", "RealEstate")
	Owner  string `json:"owner"`  // Current Owner
	Value  int    `json:"value"`  // Monetary Value
	Status string `json:"status"` // Status (e.g., "Available", "Sold", "Locked")
}

// InitLedger adds a base set of assets to the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	assets := []Asset{
		{ID: "asset1", Name: "iPhone 15 Pro", Type: "Electronics", Owner: "Tomoko", Value: 1000, Status: "Available"},
		{ID: "asset2", Name: "Tesla Model S", Type: "Vehicle", Owner: "Brad", Value: 80000, Status: "Available"},
		{ID: "asset3", Name: "Penthouse Suite", Type: "RealEstate", Owner: "Jin Soo", Value: 500000, Status: "Owned"},
		{ID: "asset4", Name: "Gold Bar 1kg", Type: "PreciousMetal", Owner: "Max", Value: 65000, Status: "Locked"},
		{ID: "asset5", Name: "Antique Vase", Type: "Art", Owner: "Adriana", Value: 5000, Status: "Available"},
		{ID: "asset6", Name: "Bitcoin", Type: "Crypto", Owner: "Michel", Value: 45000, Status: "Available"},
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

	return nil
}

// CreateAsset issues a new asset to the world state with given details.
func (s *SmartContract) CreateAsset(ctx contractapi.TransactionContextInterface, id string, name string, assetType string, owner string, value int, status string) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the asset %s already exists", id)
	}

	asset := Asset{
		ID:     id,
		Name:   name,
		Type:   assetType,
		Owner:  owner,
		Value:  value,
		Status: status,
	}
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, assetJSON)
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
func (s *SmartContract) UpdateAsset(ctx contractapi.TransactionContextInterface, id string, name string, assetType string, owner string, value int, status string) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the asset %s does not exist", id)
	}

	asset := Asset{
		ID:     id,
		Name:   name,
		Type:   assetType,
		Owner:  owner,
		Value:  value,
		Status: status,
	}
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, assetJSON)
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

	return ctx.GetStub().DelState(id)
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

	return ctx.GetStub().PutState(id, assetJSON)
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
		assets = append(assets, &asset)
	}

	return assets, nil
}
