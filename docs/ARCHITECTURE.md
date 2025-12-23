# Hyperledger Fabric Network - 1 Org, 3 Orderers, 3 Peers

Hyperledger Fabric network configuration:
- **1 Organization**: Org1
- **3 Orderers**: orderer1, orderer2, orderer3 (Raft consensus)
- **3 Peers**: peer0, peer1, peer2 (belonging to Org1)

## Directory Structure

```
network/
├── configtx.yaml                 # Channel configuration and genesis block
├── network.sh                    # Network management script
├── docker/
│   ├── docker-compose.yaml       # Docker compose for peers and orderers
│   └── docker-compose-ca.yaml    # Docker compose for Certificate Authorities
├── organizations/                # Contains crypto material (auto-generated)
├── channel-artifacts/            # Contains channel artifacts
└── system-genesis-block/         # Contains genesis block

scripts/                          # (Root directory)
├── registerEnroll.sh             # Script to register and enroll identities
├── createChannel.sh              # Script to create channel
├── deployCC.sh                   # Script to deploy chaincode
├── deployCCAAS.sh                # Script to deploy CCAAS
└── envVar.sh                     # Environment variables
```

## Requirements

- Docker and Docker Compose
- Hyperledger Fabric binaries (fabric-ca-client, configtxgen, peer, osnadmin)

## Fabric Binaries Installation

```bash
cd /home/sleep/ams
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.9 1.5.12 -d -s
```

## Usage Guide

### 1. Start the Network

```bash
cd network
chmod +x network.sh ../scripts/*.sh
./network.sh up
```

This command will:
- Start 2 Certificate Authority servers (for Org1 and Orderer Org)
- Generate crypto material for all peers and orderers
- Start 3 orderers and 3 peers

### 2. Data Model (Asset Structure)

The Smart Contract (`basic`) supports a generic commercial asset model with Marketplace extensions:

```go
type Asset struct {
    ID           string   `json:"ID"`
    Name         string   `json:"name"`
    Type         string   `json:"type"`   // E.g., "Electronics", "RealEstate"
    Owner        string   `json:"owner"`
    Status       string   `json:"status"` // "Available", "For Sale", "Owned"
    Price        float64  `json:"price"`  // Marketplace Price
    Currency     string   `json:"currency"` // Default "USD"
    MetadataURL  string   `json:"metadata_url"`
    MetadataHash string   `json:"metadata_hash"`
    Viewers      []string `json:"viewers"`
}
```

...

### 8. Admin Service (Protected)
Requires JWT Token with `role: Admin`.

*   **Dashboard Stats**: `GET /api/protected/admin/dashboard`
*   **Manage Users**: `GET /api/protected/admin/users`

### 9. Marketplace Service (Protected)
Requires JWT Token.

*   **List Asset**: `POST /api/protected/marketplace/list`
*   **Delist Asset**: `POST /api/protected/marketplace/delist/:id`
*   **Buy Asset**: `POST /api/protected/marketplace/buy/:id`
*   **Mint Credits (Admin)**: `POST /api/protected/marketplace/mint`

---

# AMS Frontend Web App

...

# 🗄️ Database Schema & Management

## Schema Structure

### `users` table
Updated to include balance.

```sql
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL, -- PII stored OFF-CHAIN only
    identity_number VARCHAR(255) NOT NULL UNIQUE, -- PII stored OFF-CHAIN only
    role VARCHAR(50) NOT NULL,
    wallet_address TEXT,
    balance DECIMAL(20, 2) DEFAULT 0.0, -- Marketplace Credit Balance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Active'
);
```

> **Note**: For privacy architectural decisions (Hybrid Core), see [PRIVACY_PATTERNS.md](PRIVACY_PATTERNS.md).

### `assets` table
Updated to include price and currency.

```sql
CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    owner VARCHAR(255) REFERENCES users(id),
    status VARCHAR(50) NOT NULL,
    price DECIMAL(20, 2) DEFAULT 0.0,
    currency VARCHAR(10) DEFAULT 'USD',
    metadata_url TEXT,
    metadata_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

...

## Sync Mechanism
The backend runs a **Block Listener** (`backend/sync/listener.go`) that subscribes to Chaincode events:

1. `AssetCreated` -> INSERT into `assets`
2. `AssetUpdated` -> UPDATE `assets`
3. `AssetTransferred` -> UPDATE `assets` owner
4. `UserStatusUpdated` -> UPDATE `users` status/balance
5. `AssetListed` / `AssetDelisted` -> UPDATE `assets` price/status
6. `CreditsMinted` -> UPDATE `users` balance
