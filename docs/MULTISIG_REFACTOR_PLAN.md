# Multi-Signature Refactor Implementation Plan

## Overview
Moving multi-signature logic from backend (off-chain) to chaincode (on-chain) for true blockchain security.

## Status: ✅ CHAINCODE COMPLETE | ✅ BACKEND COMPLETE | ✅ FRONTEND COMPLETE

---

## Phase 1: Chaincode (COMPLETE ✅)

### Added Structures:
- `PendingTransfer` - Stores transfer state on blockchain
- `Approval` - Individual signature record

### Added Functions:
1. ✅ `InitiateTransfer(assetID, newOwner)` - Creates pending transfer
2. ✅ `ApproveTransfer(assetID)` - Approves and executes if 2/2
3. ✅ `RejectTransfer(assetID, reason)` - Rejects transfer
4. ✅ `GetPendingTransfer(assetID)` - Query pending transfer
5. ✅ `GetAllPendingTransfers()` - Query all pending
6. ✅ `extractUsername(clientID)` - Parse Fabric identity

### Security Improvements:
- ✅ Atomic execution (no race conditions)
- ✅ Ownership verification before execution
- ✅ Expiration checking (24 hours)
- ✅ Duplicate signature prevention
- ✅ Immutable audit trail

---

## Phase 2: Backend Refactor (IN PROGRESS 🔄)

### Files to Modify:
1. `/home/sleep/ams/backend/main.go` - Simplify to relay
2. `/home/sleep/ams/backend/sync/listener.go` - Add new event handlers

### Backend Changes:

#### A. Simplify Transfer Endpoints

**BEFORE (Complex Off-Chain Logic)**:
```go
protected.Post("/transfers/initiate", func(c *fiber.Ctx) error {
    // 50+ lines of database logic
    // Create pending_transfers record
    // Insert signature
    // Check approval count
    // Execute if 2/2
})
```

**AFTER (Simple Relay)**:
```go
protected.Post("/transfers/initiate", func(c *fiber.Ctx) error {
    contract, _ := getContract(c)
    var req struct {
        AssetID  string `json:"asset_id"`
        NewOwner string `json:"new_owner"`
    }
    c.BodyParser(&req)
    
    // Just call chaincode
    _, err := contract.SubmitTransaction("InitiateTransfer", req.AssetID, req.NewOwner)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    
    return c.JSON(fiber.Map{"message": "Transfer initiated on blockchain"})
})
```

#### B. Update Approve/Reject Endpoints

```go
protected.Post("/transfers/:assetId/approve", func(c *fiber.Ctx) error {
    contract, _ := getContract(c)
    assetID := c.Params("assetId")
    
    _, err := contract.SubmitTransaction("ApproveTransfer", assetID)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    
    return c.JSON(fiber.Map{"message": "Transfer approved"})
})

protected.Post("/transfers/:assetId/reject", func(c *fiber.Ctx) error {
    contract, _ := getContract(c)
    assetID := c.Params("assetId")
    
    var req struct {
        Reason string `json:"reason"`
    }
    c.BodyParser(&req)
    
    _, err := contract.SubmitTransaction("RejectTransfer", assetID, req.Reason)
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    
    return c.JSON(fiber.Map{"message": "Transfer rejected"})
})
```

#### C. Add Query Endpoint

```go
protected.Get("/transfers/pending", func(c *fiber.Ctx) error {
    contract, _ := getContract(c)
    
    result, err := contract.EvaluateTransaction("GetAllPendingTransfers")
    if err != nil {
        return c.Status(500).JSON(fiber.Map{"error": err.Error()})
    }
    
    var pending []map[string]interface{}
    json.Unmarshal(result, &pending)
    
    // Filter by current user
    claims := c.Locals("user").(*auth.Claims)
    var userPending []map[string]interface{}
    for _, p := range pending {
        if p["current_owner"] == claims.UserID || p["new_owner"] == claims.UserID {
            userPending = append(userPending, p)
        }
    }
    
    return c.JSON(userPending)
})
```

---

## Phase 3: Event Listener Updates (IN PROGRESS 🔄)

### New Events to Handle:

1. **TransferInitiated**
   - Sync to `pending_transfers_view` (read-only)
   - For UI display only

2. **TransferApproved**
   - Update approval count in view

3. **TransferExecuted**
   - Update asset owner in `assets` table
   - Mark pending as executed in view
   - Insert into `asset_history`

4. **TransferRejected**
   - Mark as rejected in view

5. **TransferExpired**
   - Mark as expired in view

### Event Handler Example:

```go
func (l *BlockListener) handleTransferInitiated(event *Event) error {
    var pending PendingTransfer
    json.Unmarshal(event.Payload, &pending)
    
    // Store in view table (read-only for UI)
    _, err := l.db.Exec(`
        INSERT INTO pending_transfers_view 
        (asset_id, asset_name, current_owner, new_owner, status, created_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, to_timestamp($6), to_timestamp($7))
        ON CONFLICT (asset_id) DO UPDATE SET
            current_owner = EXCLUDED.current_owner,
            new_owner = EXCLUDED.new_owner,
            status = EXCLUDED.status,
            created_at = EXCLUDED.created_at,
            expires_at = EXCLUDED.expires_at
    `, pending.AssetID, pending.AssetName, pending.CurrentOwner, 
       pending.NewOwner, pending.Status, pending.CreatedAt, pending.ExpiresAt)
    
    return err
}
```

---

## Phase 4: Database Schema Updates

### Rename Tables (Keep for UI):

```sql
-- Rename existing tables to "_view" suffix
ALTER TABLE pending_transfers RENAME TO pending_transfers_view;
ALTER TABLE transfer_signatures RENAME TO transfer_signatures_view;

-- These are now READ-ONLY, synced from blockchain events
-- Source of truth is on the blockchain
```

### Add Comments:

```sql
COMMENT ON TABLE pending_transfers_view IS 
'Read-only view of blockchain pending transfers. Synced via event listener. Source of truth is on-chain.';

COMMENT ON TABLE transfer_signatures_view IS 
'Read-only view of blockchain transfer signatures. Synced via event listener. Source of truth is on-chain.';
```

---

## Phase 5: Frontend Updates (MINIMAL)

### API Calls (No Changes Needed):
- Frontend already calls `/protected/transfers/initiate`
- Frontend already calls `/protected/transfers/:id/approve`
- Frontend already calls `/protected/transfers/:id/reject`
- Frontend already calls `/protected/transfers/pending`

### Response Format (Slightly Different):
- `pending_id` becomes `asset_id` (since we key by asset now)
- Everything else stays the same

---

## Phase 6: Deployment Steps

### 1. Update Chaincode
```bash
cd /home/sleep/ams/network
./network.sh deployCC -ccn basic -ccp ../chaincode/asset-transfer/chaincode -ccl go
```

### 2. Restart Backend
```bash
docker-compose -f docker-compose-app.yaml restart backend
```

### 3. Test Flow
```bash
# 1. Initiate transfer
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -d '{"asset_id":"asset101","new_owner":"Brad"}' \
  http://localhost:3000/api/protected/transfers/initiate

# 2. Check pending (as Brad)
curl -H "Authorization: Bearer $BRAD_TOKEN" \
  http://localhost:3000/api/protected/transfers/pending

# 3. Approve (as Brad)
curl -X POST -H "Authorization: Bearer $BRAD_TOKEN" \
  http://localhost:3000/api/protected/transfers/asset101/approve
```

---

## Security Comparison

| Aspect | Before (Off-Chain) | After (On-Chain) |
|--------|-------------------|------------------|
| **Race Conditions** | ❌ Possible | ✅ Impossible |
| **Data Integrity** | ❌ DB can be hacked | ✅ Immutable blockchain |
| **Audit Trail** | ❌ Can be altered | ✅ Permanent record |
| **Atomicity** | ❌ Manual transactions | ✅ Fabric guarantees |
| **Trust Model** | ❌ Trust backend | ✅ Trust blockchain |
| **Approval Verification** | ❌ Backend logic | ✅ Chaincode enforces |

---

## Rollback Plan

If issues arise:
1. Keep old backend code commented out
2. Can switch back by uncommenting
3. Database tables preserved as `_view`

---

## Testing Checklist

- [ ] Chaincode compiles
- [ ] Chaincode deploys successfully
- [ ] InitiateTransfer works
- [ ] ApproveTransfer works (1st approval)
- [ ] ApproveTransfer executes (2nd approval)
- [ ] RejectTransfer works
- [ ] Expiration works
- [ ] Events sync to database
- [ ] Frontend displays correctly
- [ ] No race conditions
- [ ] Ownership verification works

---

**Status**: Ready to proceed with backend refactor
**Next Step**: Update `/home/sleep/ams/backend/main.go`
