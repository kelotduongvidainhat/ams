# Asset Provenance Tracking

## Overview
The Asset Management System now includes comprehensive provenance tracking that records **who performed each action** on every asset. This creates a complete, immutable audit trail on the blockchain.

## Features

### LastModifiedBy Field
Every asset on the blockchain includes a `last_modified_by` field that stores the UserID of the person who last modified the asset.

```json
{
  "ID": "asset101",
  "name": "Luxury Penthouse",
  "owner": "Tomoko",
  "status": "For Sale",
  "last_modified_by": "Tomoko"
}
```

### Tracked Actions
The following operations automatically record the actor:
- **CreateAsset**: Records the creator
- **UpdateAsset**: Records the updater
- **LockAsset/UnlockAsset**: Records the admin who locked/unlocked
- **ListAsset/DelistAsset**: Records the owner who listed/delisted
- **BuyAsset**: Records the buyer
- **TransferAsset**: Records the approver who executed the transfer

## Usage

### Querying Asset Provenance
```bash
# Via CLI
docker exec cli peer chaincode query -C mychannel -n basic \
  -c '{"Args":["ReadAsset","asset101"]}'

# Via API
curl "http://localhost:3000/api/assets?user_id=User1"
```

### Viewing Full History
Query the PostgreSQL database for complete audit trail:
```sql
SELECT 
  asset_id,
  action_type,
  actor_id,
  to_owner,
  timestamp
FROM asset_history
WHERE asset_id = 'asset101'
ORDER BY timestamp DESC;
```

**Example Result:**
| asset_id | action_type | actor_id | to_owner | timestamp |
|----------|-------------|----------|----------|-----------|
| asset101 | LISTED      | Tomoko   | Tomoko   | 2025-12-24 10:15:22 |
| asset101 | CREATED     | Tomoko   | Tomoko   | 2025-12-24 10:14:10 |

## Technical Implementation

### Chaincode
- Added `LastModifiedBy string` field to the `Asset` struct
- Updated all state-changing functions to populate this field using `getSubmittingClientIdentity()`

### Backend
- Updated Event Listener to extract `last_modified_by` from asset events
- Persists this value to `asset_history.actor_id` column in PostgreSQL

### Security
- The `LastModifiedBy` field is set automatically by the chaincode based on the transaction certificate
- Cannot be spoofed or manually set by clients
- Provides cryptographic proof of who performed each action

## Benefits

### For Administrators
- Complete visibility into all asset modifications
- Enhanced compliance and regulatory reporting
- Clear accountability for sensitive operations (lock/unlock)

### For Auditors
- Immutable audit trail on the blockchain
- Easy filtering and reporting via PostgreSQL
- Cryptographic proof of authenticity

### For Users
- Transparent history of asset ownership and modifications
- Trust and verifiability in the system
