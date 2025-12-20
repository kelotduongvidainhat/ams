# Transaction Documentation - AMS System

## 📋 Table of Contents

1. [Overview](#overview)
2. [Transaction Types](#transaction-types)
3. [Transaction Lifecycle](#transaction-lifecycle)
4. [Multi-Signature Transactions](#multi-signature-transactions)
5. [Transaction Security](#transaction-security)
6. [Error Handling](#error-handling)
7. [Performance Considerations](#performance-considerations)
8. [Monitoring & Debugging](#monitoring--debugging)

---

## Overview

The AMS (Asset Management System) uses **Hyperledger Fabric** for blockchain transactions and **PostgreSQL** for off-chain indexing. All transactions are cryptographically signed and immutably recorded on the blockchain.

### Transaction Architecture

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Frontend  │─────▶│   Backend   │─────▶│  Blockchain  │─────▶│  PostgreSQL │
│   (React)   │◀─────│  (Go/Fiber) │◀─────│   (Fabric)   │◀─────│  (Indexer)  │
└─────────────┘      └─────────────┘      └──────────────┘      └─────────────┘
     JWT Auth         API Gateway         Smart Contract        Event Listener
```

### Key Components

- **Frontend**: User interface for transaction initiation
- **Backend API**: Transaction validation and routing
- **Fabric Gateway**: Blockchain transaction submission
- **Smart Contract (Chaincode)**: Business logic execution
- **Event Listener**: Async synchronization to PostgreSQL

---

## Transaction Types

### 1. Asset Creation (`CreateAsset`)

**Purpose**: Create a new asset on the blockchain

**Chaincode Function**: `CreateAsset(id, name, type, owner, status, metadataURL, metadataHash, viewers)`

**API Endpoint**: `POST /api/protected/assets`

**Request Example**:
```json
{
  "ID": "asset101",
  "name": "Luxury Penthouse",
  "type": "RealEstate",
  "status": "Available",
  "metadata_url": "https://ipfs.io/ipfs/QmXYZ..."
}
```

**Response**:
```json
{
  "id": "asset101",
  "hash": "a3f5b8c9d2e1...",
  "message": "Asset created successfully"
}
```

**Blockchain State Changes**:
- New asset record written to world state
- `AssetCreated` event emitted
- Transaction ID recorded in block

**Database Sync**:
```sql
INSERT INTO assets (id, name, asset_type, owner, status, metadata_url, metadata_hash, viewers, last_tx_id, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);

INSERT INTO asset_history (asset_id, tx_id, timestamp, is_delete, record)
VALUES ($1, $2, $3, false, $4);
```

**Authorization**:
- ✅ Authenticated user (JWT required)
- ✅ Any role (User, Admin, Auditor)

**Validation Rules**:
- Asset ID must be unique
- Name, Type, Owner are required
- Metadata URL must be valid format
- Metadata hash auto-calculated (SHA-256)

---

### 2. Asset Transfer (`TransferAsset`) - Multi-Signature

**Purpose**: Transfer asset ownership with 2-party approval

**Chaincode Function**: `TransferAsset(id, newOwner)`

**API Endpoints**:
1. `POST /api/protected/transfers/initiate` - Start transfer
2. `GET /api/protected/transfers/pending` - View pending
3. `POST /api/protected/transfers/:id/approve` - Approve
4. `POST /api/protected/transfers/:id/reject` - Reject

#### Phase 1: Initiation

**Request**:
```json
{
  "asset_id": "asset101",
  "new_owner": "Brad"
}
```

**Response**:
```json
{
  "message": "Transfer initiated. Awaiting approval from recipient.",
  "pending_id": 1,
  "status": "PENDING",
  "expires_in_hours": 24
}
```

**Database Operations**:
```sql
-- Create pending transfer
INSERT INTO pending_transfers (asset_id, asset_name, current_owner, new_owner, status, expires_at)
VALUES ($1, $2, $3, $4, 'PENDING', NOW() + INTERVAL '24 hours')
RETURNING id;

-- Auto-approve by initiator
INSERT INTO transfer_signatures (pending_transfer_id, signer_id, signer_role, action, comment)
VALUES ($1, $2, 'CURRENT_OWNER', 'APPROVED', 'Initiated transfer');
```

**State**: `PENDING` (1/2 signatures)

#### Phase 2: Approval

**Request**:
```bash
POST /api/protected/transfers/1/approve
```

**Response (if 2nd signature)**:
```json
{
  "message": "Transfer approved and executed successfully!",
  "status": "EXECUTED"
}
```

**Chaincode Execution**:
```go
// 1. Verify signatures and expiration
if len(pending.Approvals) >= 2 {
    // 2. Atomic Status Update
    pending.Status = "EXECUTED"
    
    // 3. Asset Ownership Transfer
    asset.Owner = pending.NewOwner
    
    // 4. Emit Events
    ctx.GetStub().SetEvent("AssetTransferred", assetJSON)
}
```

**Blockchain State Changes**:
- Asset owner updated in world state
- `AssetTransferred` event emitted
- Previous owner → New owner

**Timeline**:
- **T+0**: Initiated (1/2)
- **T+1min to 24h**: Approved → Executes immediately
- **T+24h**: Auto-expires if not approved

**Authorization**:
- ✅ Current owner can initiate
- ✅ New owner can approve/reject
- ❌ Third parties cannot interact

---

### 3. Asset Update (`UpdateAsset`)

**Purpose**: Modify mutable asset fields

**Chaincode Function**: `UpdateAsset(id, name, type, owner, status, metadataURL, metadataHash, viewers)`

**API Endpoint**: `PUT /api/protected/assets/:id`

**Request**:
```json
{
  "name": "Updated Penthouse Name",
  "status": "Under Maintenance",
  "metadata_url": "https://ipfs.io/ipfs/QmABC..."
}
```

**Response**:
```json
{
  "id": "asset101",
  "hash": "b4c6d9e2f3a1...",
  "message": "Asset updated successfully"
}
```

**Mutable Fields**:
- ✅ `name` - Asset name
- ✅ `status` - Current status
- ✅ `metadata_url` - Metadata location
- ✅ `metadata_hash` - Auto-recalculated

**Immutable Fields**:
- ❌ `ID` - Cannot change
- ❌ `type` - Cannot change
- ❌ `owner` - Use TransferAsset instead

**Blockchain State Changes**:
- Asset record updated in world state
- `AssetUpdated` event emitted
- New metadata hash calculated

**Authorization**:
- ✅ Asset owner
- ✅ Admin role

---

### 4. Grant Access (`GrantAccess`)

**Purpose**: Share asset with specific users

**Chaincode Function**: `GrantAccess(id, viewerID)`

**API Endpoint**: `POST /api/protected/assets/:id/access`

**Request**:
```json
{
  "viewer_id": "Brad"
}
```

**Response**:
```json
{
  "message": "Access granted successfully"
}
```

**Blockchain State Changes**:
- Viewer added to `viewers` array
- `AccessGranted` event emitted

**Access Levels**:
```javascript
viewers: []              // Private (owner only)
viewers: ["Brad"]        // Brad can view
viewers: ["EVERYONE"]    // Public
```

**Authorization**:
- ✅ Asset owner only

---

### 5. Revoke Access (`RevokeAccess`)

**Purpose**: Remove viewer permissions

**Chaincode Function**: `RevokeAccess(id, viewerID)`

**API Endpoint**: `DELETE /api/protected/assets/:id/access/:viewerId`

**Blockchain State Changes**:
- Viewer removed from `viewers` array
- `AccessRevoked` event emitted

---

### 6. Delete Asset (`DeleteAsset`)

**Purpose**: Mark asset as deleted (soft delete)

**Chaincode Function**: `DeleteAsset(id)`

**API Endpoint**: `DELETE /api/protected/assets/:id`

**Blockchain State Changes**:
- Asset marked as deleted in world state
- `AssetDeleted` event emitted
- Historical records preserved

**Authorization**:
- ✅ Asset owner
- ✅ Admin role

---

## Transaction Lifecycle

### 1. Submission Phase

```
User Action → Frontend Validation → API Request → JWT Verification
```

**Frontend Validation**:
- Required fields check
- Format validation
- Client-side authorization

**Backend Validation**:
- JWT token verification
- User role check
- Business logic validation

### 2. Blockchain Execution Phase

```
Gateway Connection → Transaction Proposal → Endorsement → Ordering → Commit
```

**Steps**:
1. **Proposal**: Backend submits transaction to peers
2. **Endorsement**: Peers execute chaincode and sign result
3. **Ordering**: Orderers sequence transactions into blocks
4. **Commit**: Peers validate and commit block to ledger

**Typical Timing**:
- Endorsement: ~100-300ms
- Ordering: ~1-2 seconds
- Commit: ~500ms-1s
- **Total**: ~2-4 seconds

### 3. Event Synchronization Phase

```
Block Commit → Event Emission → Listener Capture → Database Update
```

**Event Listener** (`backend/sync/listener.go`):
```go
func StartEventListening() {
    events, err := network.ChaincodeEvents(ctx, chaincodeName)
    for event := range events {
        switch event.EventName {
        case "AssetCreated":
            syncAssetCreated(event)
        case "AssetTransferred":
            syncAssetTransferred(event)
        // ... other events
        }
    }
}
```

**Database Sync Timing**: ~100-500ms after blockchain commit

---

## Multi-Signature Transactions

### Design Pattern

The multi-signature system implements a **2-of-2 approval** pattern:

```
Initiator (Auto-Approve) + Recipient (Manual Approve) = Execution
```

### State Machine

```
┌─────────┐  initiate   ┌─────────┐  approve(2/2)  ┌──────────┐
│  START  │────────────▶│ PENDING │───────────────▶│ EXECUTED │
└─────────┘             └─────────┘                └──────────┘
                             │                           ▲
                             │ reject                    │
                             │ OR expire                 │
                             ▼                           │
                        ┌──────────┐                     │
                        │ REJECTED │─────────────────────┘
                        │ EXPIRED  │
                        └──────────┘
```

### Chaincode Data Structures

All multi-signature state is stored directly on the Ledger (World State):

```go
type PendingTransfer struct {
    DocType      string     `json:"docType"`      // "pending_transfer"
    AssetID      string     `json:"asset_id"`
    CurrentOwner string     `json:"current_owner"`
    NewOwner     string     `json:"new_owner"`
    Status       string     `json:"status"`       // PENDING, EXECUTED, REJECTED, EXPIRED
    Approvals    []Approval `json:"approvals"`
    CreatedAt    int64      `json:"created_at"`   // Unix timestamp
    ExpiresAt    int64      `json:"expires_at"`   // Unix timestamp (+24h)
}

type Approval struct {
    Signer    string `json:"signer"`
    Role      string `json:"role"`
    Timestamp int64  `json:"timestamp"`
}
```

### Expiration Handling

**On-Chain Validation**:
```go
// Check during ApproveTransfer execution
timestamp, _ := ctx.GetStub().GetTxTimestamp()
now := timestamp.Seconds

if now > pending.ExpiresAt {
    pending.Status = "EXPIRED"
    ctx.GetStub().PutState(key, pending)
    return fmt.Errorf("transfer request has expired")
}
```

---

## Transaction Security

### 1. Authentication

**JWT Token Structure**:
```json
{
  "user_id": "Tomoko",
  "role": "User",
  "exp": 1703073600,
  "iat": 1703070000
}
```

**Token Validation**:
```go
claims := c.Locals("user").(*auth.Claims)
if claims.UserID != asset.Owner && claims.Role != "Admin" {
    return c.Status(403).JSON(fiber.Map{"error": "Unauthorized"})
}
```

### 2. Authorization Matrix

| Operation | Owner | Admin | Auditor | Public |
|-----------|-------|-------|---------|--------|
| Create Asset | ✅ | ✅ | ✅ | ❌ |
| Transfer (Initiate) | ✅ | ❌ | ❌ | ❌ |
| Transfer (Approve) | ✅* | ❌ | ❌ | ❌ |
| Update Asset | ✅ | ✅ | ❌ | ❌ |
| Delete Asset | ✅ | ✅ | ❌ | ❌ |
| Grant Access | ✅ | ❌ | ❌ | ❌ |
| View Asset | ✅ | ✅ | ✅ | ✅** |
| View History | ✅ | ✅ | ✅ | ✅ |

*Only if user is recipient  
**Only if asset is public

### 3. Data Integrity

**Metadata Hash Calculation**:
```go
func calculateMetadataHash(metadataURL, name string) string {
    data := metadataURL + name
    hash := sha256.Sum256([]byte(data))
    return hex.EncodeToString(hash[:])
}
```

**Verification**:
- Hash stored on blockchain (immutable)
- Can verify off-chain data hasn't been tampered
- Recalculated on every update

### 4. Blockchain Security

**Fabric Security Features**:
- ✅ TLS encryption for all communications
- ✅ MSP (Membership Service Provider) for identity
- ✅ Endorsement policies for transaction validation
- ✅ Raft consensus for ordering
- ✅ Channel isolation for privacy

---

## Error Handling

### Common Error Scenarios

#### 1. Asset Not Found
```json
{
  "error": "Asset not found",
  "status": 404
}
```

**Causes**:
- Invalid asset ID
- Asset deleted
- No read permission

#### 2. Unauthorized
```json
{
  "error": "Only asset owner can initiate transfer",
  "status": 403
}
```

**Causes**:
- User is not owner
- Insufficient role permissions
- Invalid JWT token

#### 3. Transfer Expired
```json
{
  "error": "Transfer request has expired",
  "status": 400
}
```

**Causes**:
- More than 24 hours since initiation
- Recipient didn't approve in time

#### 4. Duplicate Signature
```json
{
  "error": "You have already signed this transfer",
  "status": 400
}
```

**Causes**:
- User trying to approve/reject twice
- Database constraint violation

#### 5. Blockchain Error
```json
{
  "error": "Failed to execute transfer on blockchain: endorsement failure",
  "status": 500
}
```

**Causes**:
- Network connectivity issues
- Chaincode execution error
- Endorsement policy not met

### Error Recovery

**Frontend Retry Logic**:
```typescript
async function retryTransaction(fn: Function, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await sleep(1000 * (i + 1)); // Exponential backoff
        }
    }
}
```

**Backend Logging**:
```go
log.Printf("❌ Transfer failed: Asset %s, Error: %v", assetID, err)
```

---

## Performance Considerations

### 1. Transaction Throughput

**Fabric Network Capacity**:
- ~1000-3000 TPS (transactions per second)
- Block size: 10 transactions
- Block time: ~2 seconds

**Bottlenecks**:
- Endorsement phase (peer execution)
- Ordering phase (consensus)
- Commit phase (state validation)

### 2. Database Optimization

**Indexes**:
```sql
CREATE INDEX idx_pending_transfers_current_owner ON pending_transfers(current_owner);
CREATE INDEX idx_pending_transfers_new_owner ON pending_transfers(new_owner);
CREATE INDEX idx_pending_transfers_status ON pending_transfers(status);
CREATE INDEX idx_pending_transfers_expires_at ON pending_transfers(expires_at);
```

**Query Optimization**:
```sql
-- Efficient pending transfer query
SELECT pt.*, 
       (SELECT COUNT(*) FROM transfer_signatures 
        WHERE pending_transfer_id = pt.id AND action = 'APPROVED') as approval_count
FROM pending_transfers pt
WHERE (pt.current_owner = $1 OR pt.new_owner = $1)
  AND pt.status = 'PENDING'
  AND pt.expires_at > NOW()
ORDER BY pt.created_at DESC;
```

### 3. Caching Strategy

**Frontend Polling**:
```typescript
// Poll every 30 seconds
useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    return () => clearInterval(interval);
}, []);
```

**Future Enhancement - WebSocket**:
```typescript
// Real-time updates
const ws = new WebSocket('ws://localhost:3000/ws/transfers');
ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    updatePendingCount(update.count);
};
```

---

## Monitoring & Debugging

### 1. Transaction Logging

**Backend Logs**:
```
2025/12/20 08:00:00 📝 Transfer initiated: Asset asset101 from Tomoko to Brad (Pending ID: 1)
2025/12/20 08:05:00 ✅ All signatures collected. Executing transfer: Asset asset101 from Tomoko to Brad
2025/12/20 08:05:02 ✅ Synced Asset asset101 to Postgres
```

**Log Levels**:
- `INFO`: Normal operations
- `WARN`: Recoverable errors
- `ERROR`: Critical failures

### 2. Blockchain Explorer

**Query Transaction**:
```bash
# Get transaction by ID
peer chaincode query -C mychannel -n basic \
  -c '{"function":"ReadAsset","Args":["asset101"]}'
```

**View Block**:
```bash
# Get latest block
peer channel getinfo -c mychannel
```

### 3. Database Monitoring

**Pending Transfer Stats**:
```sql
SELECT 
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (executed_at - created_at))) as avg_execution_time_seconds
FROM pending_transfers
GROUP BY status;
```

**Signature Analysis**:
```sql
SELECT 
    signer_role,
    action,
    COUNT(*) as count
FROM transfer_signatures
GROUP BY signer_role, action;
```

### 4. Performance Metrics

**Key Metrics to Track**:
- Transaction latency (end-to-end)
- Blockchain commit time
- Database sync delay
- Pending transfer approval rate
- Expiration rate

**Example Metrics**:
```
Average Transaction Time: 2.3s
Blockchain Commit: 1.8s
DB Sync Delay: 0.3s
Approval Rate: 87%
Expiration Rate: 13%
```

---

## Best Practices

### 1. Transaction Design

✅ **DO**:
- Keep transactions atomic and focused
- Validate inputs before blockchain submission
- Use meaningful transaction IDs
- Log all transaction attempts

❌ **DON'T**:
- Bundle multiple operations in one transaction
- Store large data on blockchain
- Skip authorization checks
- Ignore error responses

### 2. Multi-Sig Transfers

✅ **DO**:
- Set reasonable expiration times
- Notify recipients immediately
- Provide clear approval/rejection reasons
- Clean up expired transfers

❌ **DON'T**:
- Allow indefinite pending state
- Skip signature verification
- Execute without full approval count
- Ignore expiration checks

### 3. Error Handling

✅ **DO**:
- Return descriptive error messages
- Log errors with context
- Implement retry logic for transient failures
- Validate before expensive operations

❌ **DON'T**:
- Expose internal error details to users
- Silently fail transactions
- Retry indefinitely
- Skip validation steps

---

## Appendix

### A. Transaction Event Types

| Event Name | Trigger | Payload |
|------------|---------|---------|
| `AssetCreated` | CreateAsset | Full asset object |
| `AssetUpdated` | UpdateAsset | Updated asset object |
| `AssetTransferred` | TransferAsset | Asset ID, old owner, new owner |
| `AssetDeleted` | DeleteAsset | Asset ID |
| `AccessGranted` | GrantAccess | Asset ID, viewer ID |
| `AccessRevoked` | RevokeAccess | Asset ID, viewer ID |
| `UserCreated` | CreateUser | User object |

### B. API Response Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Asset retrieved |
| 201 | Created | Asset created |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid JWT |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Asset doesn't exist |
| 500 | Server Error | Blockchain failure |
| 503 | Service Unavailable | Database down |

### C. Useful Commands

**Check Pending Transfers**:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/protected/transfers/pending | jq .
```

**Initiate Transfer**:
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"asset_id":"asset101","new_owner":"Brad"}' \
  http://localhost:3000/api/protected/transfers/initiate | jq .
```

**Approve Transfer**:
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/protected/transfers/1/approve | jq .
```

---

**Last Updated**: 2025-12-20  
**Version**: 1.0.0  
**Author**: AMS Development Team
