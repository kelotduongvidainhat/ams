package chaincode

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ListAsset sets an asset for sale with a specific price
func (s *SmartContract) ListAsset(ctx contractapi.TransactionContextInterface, assetID string, price float64) error {
	if price <= 0 {
		return fmt.Errorf("price must be greater than 0")
	}

	asset, err := s.ReadAsset(ctx, assetID)
	if err != nil {
		return err
	}

	// Check Lock Status
	if asset.Status == "Locked" {
		return fmt.Errorf("asset is locked and cannot be listed")
	}

	// Verify Identity
	clientID, err := s.getSubmittingClientIdentity(ctx)
	if err != nil {
		return err
	}
	if asset.Owner != clientID {
		return fmt.Errorf("only the asset owner can list it. Owner: %s, Signer: %s", asset.Owner, clientID)
	}

	asset.Status = "For Sale"
	asset.Price = price
	asset.Currency = "USD"
	asset.LastModifiedBy = clientID

	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(assetID, assetJSON)
	if err != nil {
		return err
	}
	
	return ctx.GetStub().SetEvent("AssetListed", assetJSON)
}

// DelistAsset removes an asset from sale
func (s *SmartContract) DelistAsset(ctx contractapi.TransactionContextInterface, assetID string) error {
	asset, err := s.ReadAsset(ctx, assetID)
	if err != nil {
		return err
	}
	
	// Check Lock Status
	if asset.Status == "Locked" {
		return fmt.Errorf("asset is locked")
	}

	if asset.Status != "For Sale" {
		return fmt.Errorf("asset is not for sale")
	}

	// Verify Identity
	clientID, err := s.getSubmittingClientIdentity(ctx)
	if err != nil {
		return err
	}
	if asset.Owner != clientID {
		return fmt.Errorf("only the asset owner can delist it. Owner: %s, Signer: %s", asset.Owner, clientID)
	}

	asset.Status = "Available"
	asset.Price = 0
	asset.LastModifiedBy = clientID
	
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(assetID, assetJSON)
	if err != nil {
		return err
	}
	
	return ctx.GetStub().SetEvent("AssetDelisted", assetJSON)
}

// MintCredits adds balance to a user (Admin/Dev only)
func (s *SmartContract) MintCredits(ctx contractapi.TransactionContextInterface, userID string, amount float64) error {
	// Verify Admin
	clientID, err := s.getSubmittingClientIdentity(ctx)
	if err != nil {
		return err
	}
	if clientID != "admin" && clientID != "Admin@org1.example.com" {
		return fmt.Errorf("only admin can mint credits. Signer: %s", clientID)
	}

	if amount <= 0 {
		return fmt.Errorf("amount must be positive")
	}

	user, err := s.ReadUser(ctx, userID)
	if err != nil {
		return err
	}

	user.Balance += amount
	
	userBytes, err := json.Marshal(user)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(userID, userBytes)
	if err != nil {
		return err
	}

	return ctx.GetStub().SetEvent("CreditsMinted", userBytes)
}

// BuyAsset executes the purchase of an asset
func (s *SmartContract) BuyAsset(ctx contractapi.TransactionContextInterface, assetID string, buyerID string) error {
	// 1. Get Asset
	asset, err := s.ReadAsset(ctx, assetID)
	if err != nil {
		return err
	}

	// 2. Validate Sale Status
	if asset.Status != "For Sale" {
		return fmt.Errorf("asset %s is not for sale", assetID)
	}

	// 3. Get Buyer
	buyer, err := s.ReadUser(ctx, buyerID)
	if err != nil {
		return fmt.Errorf("buyer not found: %v", err)
	}

	// Verify Buyer Identity
	clientID, err := s.getSubmittingClientIdentity(ctx)
	if err != nil {
		return err
	}
	if buyer.ID != clientID {
		return fmt.Errorf("you can only buy assets for yourself. Buyer: %s, Signer: %s", buyer.ID, clientID)
	}

	// 4. Get Seller
	seller, err := s.ReadUser(ctx, asset.Owner)
	if err != nil {
		return fmt.Errorf("seller not found: %v", err)
	}

	// 5. Check Cannot Buy Own Asset
	if buyer.ID == seller.ID {
		return fmt.Errorf("cannot buy your own asset")
	}

	// 6. Check Balance
	if buyer.Balance < asset.Price {
		return fmt.Errorf("insufficient balance. Required: %.2f, Available: %.2f", asset.Price, buyer.Balance)
	}

	// 7. Execute Financial Transaction
	buyer.Balance -= asset.Price
	seller.Balance += asset.Price

	// 8. Update Asset Ownership
	asset.Owner = buyer.ID
	asset.Status = "Owned"
	asset.Price = 0
	asset.LastModifiedBy = buyer.ID // Buyer initiated the purchase

	// 9. Commit Changes
	buyerJSON, _ := json.Marshal(buyer)
	ctx.GetStub().PutState(buyer.ID, buyerJSON)

	sellerJSON, _ := json.Marshal(seller)
	ctx.GetStub().PutState(seller.ID, sellerJSON)

	assetJSON, _ := json.Marshal(asset)
	ctx.GetStub().PutState(asset.ID, assetJSON)

	// Emit Events
	ctx.GetStub().SetEvent("UserStatusUpdated", buyerJSON)
	ctx.GetStub().SetEvent("UserStatusUpdated", sellerJSON)
	return ctx.GetStub().SetEvent("AssetTransferred", assetJSON)
}
