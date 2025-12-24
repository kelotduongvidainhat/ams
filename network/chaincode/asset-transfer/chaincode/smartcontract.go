package chaincode

import (
	"encoding/json"
	"fmt"
	
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// getSubmittingClientIdentity returns the ID (CommonName) of the transaction submitter
func (s *SmartContract) getSubmittingClientIdentity(ctx contractapi.TransactionContextInterface) (string, error) {
	// Method 1: GetX509Certificate (Best for realcerts)
	cert, err := ctx.GetClientIdentity().GetX509Certificate()
	if err == nil && cert != nil {
		if cert.Subject.CommonName != "" {
			return cert.Subject.CommonName, nil
		}
	}

	// Method 2: Fallback to ClientID parsing (for some test setups)
	clientID, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return "", fmt.Errorf("failed to get client identity: %v", err)
	}
	
	// Format is usually: x509::/CN=Username::/OU=...
	return extractUsername(clientID), nil
}

// extractUsername parses the CN from the Hyperledger Fabric client ID string
func extractUsername(clientID string) string {
	start := len("x509::/CN=")
	for i := 0; i < len(clientID)-start; i++ {
		if clientID[i:i+len("x509::/CN=")] == "x509::/CN=" {
			// Found start
			remaining := clientID[i+len("x509::/CN="):]
			// Find end (::)
			for j := 0; j < len(remaining); j++ {
				if j+2 <= len(remaining) && remaining[j:j+2] == "::" {
					return remaining[:j]
				}
			}
			// If no end found, maybe it's at the end of string
			return remaining
		}
	}
	return clientID
}

// SmartContract provides functions for managing an Asset
type SmartContract struct {
	contractapi.Contract
}

// NewSmartContract returns a new SmartContract
func NewSmartContract() (*SmartContract, error) {
	return &SmartContract{}, nil
}

// InitLedger adds a base set of assets to the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	assets := []Asset{
		{DocType: "asset", ID: "asset1", Name: "iPhone 15 Pro", Type: "Electronics", Owner: "Tomoko", Status: "For Sale", MetadataURL: "http://example.com/asset1.json", MetadataHash: "hash_asset1", Viewers: []string{"EVERYONE"}, Price: 999.00, Currency: "USD"},
		{DocType: "asset", ID: "asset2", Name: "Tesla Model S", Type: "Vehicle", Owner: "Brad", Status: "For Sale", MetadataURL: "http://example.com/asset2.json", MetadataHash: "hash_asset2", Viewers: []string{}, Price: 79000.00, Currency: "USD"},
		{DocType: "asset", ID: "asset3", Name: "Penthouse Suite", Type: "RealEstate", Owner: "JinSoo", Status: "Owned", MetadataURL: "http://example.com/asset3.json", MetadataHash: "hash_asset3", Viewers: []string{"auditor"}, Price: 0, Currency: "USD"},
		{DocType: "asset", ID: "asset4", Name: "Gold Bar 1kg", Type: "PreciousMetal", Owner: "Max", Status: "Locked", MetadataURL: "http://example.com/asset4.json", MetadataHash: "hash_asset4", Viewers: []string{}, Price: 65000.00, Currency: "USD"},
		{DocType: "asset", ID: "asset5", Name: "Antique Vase", Type: "Art", Owner: "Adriana", Status: "Available", MetadataURL: "http://example.com/asset5.json", MetadataHash: "hash_asset5", Viewers: []string{"Tomoko"}, Price: 0, Currency: "USD"},
		{DocType: "asset", ID: "asset6", Name: "Bitcoin", Type: "Crypto", Owner: "Michel", Status: "For Sale", MetadataURL: "http://example.com/asset6.json", MetadataHash: "hash_asset6", Viewers: []string{"EVERYONE"}, Price: 45000.00, Currency: "USD"},
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
		{DocType: "user", ID: "user01", FullName: "User One", IdentityNumber: "ID001", Role: "User", Status: "Active", Balance: 1000},
		{DocType: "user", ID: "Tomoko", FullName: "Tomoko", IdentityNumber: "ID002", Role: "User", Status: "Active", Balance: 1000},
		{DocType: "user", ID: "Brad", FullName: "Brad", IdentityNumber: "ID003", Role: "User", Status: "Active", Balance: 1500},
		{DocType: "user", ID: "JinSoo", FullName: "Jin Soo", IdentityNumber: "ID004", Role: "User", Status: "Active", Balance: 2000},
		{DocType: "user", ID: "Max", FullName: "Max", IdentityNumber: "ID005", Role: "User", Status: "Active", Balance: 2500},
		{DocType: "user", ID: "Adriana", FullName: "Adriana", IdentityNumber: "ID006", Role: "User", Status: "Active", Balance: 3000},
		{DocType: "user", ID: "Michel", FullName: "Michel", IdentityNumber: "ID007", Role: "User", Status: "Active", Balance: 1000},
		{DocType: "user", ID: "admin", FullName: "System Admin", IdentityNumber: "ID000", Role: "Admin", Status: "Active", Balance: 0},
		{DocType: "user", ID: "auditor", FullName: "Auditor One", IdentityNumber: "ID999", Role: "Auditor", Status: "Active", Balance: 0},
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

