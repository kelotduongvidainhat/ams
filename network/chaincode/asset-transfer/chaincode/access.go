package chaincode

import (
	"encoding/json"
	
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

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
