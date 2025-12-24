package chaincode

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

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
		asset.Owner = pending.NewOwner
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

		// Persist EXECUTED status
		pendingJSON, err := json.Marshal(pending)
		if err != nil {
			return fmt.Errorf("failed to marshal pending transfer: %v", err)
		}
		err = ctx.GetStub().PutState(pendingKey, pendingJSON)
		if err != nil {
			return fmt.Errorf("failed to update pending transfer status: %v", err)
		}

		// Emit execution event
		ctx.GetStub().SetEvent("AssetTransferred", assetJSON)
		
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

		// Return all statuses (PENDING, EXECUTED, REJECTED, EXPIRED)
		pendingTransfers = append(pendingTransfers, &pending)
	}

	return pendingTransfers, nil
}
