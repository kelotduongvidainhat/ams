package chaincode

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// User describes the participant in the network
type User struct {
	DocType        string  `json:"docType"`
	ID             string  `json:"id"`
	FullName       string  `json:"full_name"`
	IdentityNumber string  `json:"identity_number"` // CCCD/Passport
	WalletAddress  string  `json:"wallet_address"`  // Optional: For future non-custodial features
	Role           string  `json:"role"`            // Admin, User, Auditor
	Status         string  `json:"status"`          // Active, Locked
	Balance        float64 `json:"balance"`         // On-chain Credit Balance
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
		DocType:        "user",
		ID:             id,
		FullName:       fullName,
		IdentityNumber: identityNumber,
		Role:           role,
		WalletAddress:  "", // Empty for now
		Status:         "Active",
		Balance:        0,
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

// UpdateUser allows a user to update their personal information
func (s *SmartContract) UpdateUser(ctx contractapi.TransactionContextInterface, id string, newFullName string, newIdentityNumber string) error {
	// 1. Get User
	user, err := s.ReadUser(ctx, id)
	if err != nil {
		return err
	}

	// Verify Identity
	clientID, err := s.getSubmittingClientIdentity(ctx)
	if err != nil {
		return err
	}
	if user.ID != clientID {
		return fmt.Errorf("you can only update your own profile. User: %s, Signer: %s", user.ID, clientID)
	}

	// 2. Update Fields
	if newFullName != "" {
		user.FullName = newFullName
	}
	if newIdentityNumber != "" {
		user.IdentityNumber = newIdentityNumber
	}
	
	userBytes, err := json.Marshal(user)
	if err != nil {
		return err
	}

	// 3. Commit to Ledger
	err = ctx.GetStub().PutState(id, userBytes)
	if err != nil {
		return err
	}

	// 4. Emit Event
	return ctx.GetStub().SetEvent("UserUpdated", userBytes)
}

// SetUserStatus updates the status of a user (e.g. "Locked" or "Active")
func (s *SmartContract) SetUserStatus(ctx contractapi.TransactionContextInterface, targetUserID string, newStatus string, adminID string) error {
	// 1. Verify Admin (Caller)
	// Ideally we check Client Identity here, but passing adminID for simulation/logging consistency
	clientID, err := s.getSubmittingClientIdentity(ctx)
	if err != nil {
		return err
	}
	if clientID != "admin" && clientID != "Admin@org1.example.com" {
		return fmt.Errorf("only admin can set user status. Signer: %s", clientID)
	}
	
	// 2. Get Target User
	user, err := s.ReadUser(ctx, targetUserID)
	if err != nil {
		return err
	}

	// 3. Update Status
	user.Status = newStatus
	
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
