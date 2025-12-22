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

The Smart Contract (`basic`) has been updated to support a generic commercial asset model:

```go
type Asset struct {
    ID     string `json:"ID"`
    Name   string `json:"name"`   // E.g., "iPhone 15 Pro"
    Type   string `json:"type"`   // E.g., "Electronics", "RealEstate"
    Owner  string `json:"owner"`  // E.g., "Tomoko"
    Value  int    `json:"value"`  // Valuation
    Status string `json:"status"` // E.g., "Available", "Sold"
}
```

### 3. Operations & Testing

#### Quick Test
Use the `test_network.sh` script to run automated test scenarios (Query, Create, Transfer):

```bash
cd network
./test_network.sh
```

#### Manual Commands

### 4. Create and Join Channel

```bash
./network.sh createChannel -c mychannel
```

**Note**: If you encounter errors joining peer1 and peer2, run the following commands to join manually:

```bash
docker exec -e CORE_PEER_ADDRESS=peer1.org1.example.com:8051 cli peer channel join -b ./channel-artifacts/mychannel.block
docker exec -e CORE_PEER_ADDRESS=peer2.org1.example.com:9051 cli peer channel join -b ./channel-artifacts/mychannel.block
```

### 5. Check Network Status

```bash
chmod +x check-status.sh
./check-status.sh
```

This script will display:
- Status of all containers
- Channel information
- Status of each peer
- Status of each orderer

### 6. Manual Status Check

```bash
# View running containers
docker ps

# Check channels joined by peer
docker exec cli peer channel list

# Check channel information
docker exec cli peer channel getinfo -c mychannel

# View logs of a specific container
docker logs peer0.org1.example.com
docker logs orderer1.example.com
```

### 7. Deploy Chaincode (Using Chaincode-as-a-Service)

The system uses the CCAAS (Chaincode-as-a-Service) model to avoid Docker-in-Docker build issues. The chaincode runs as a separate Docker container.

```bash
# Deploy basic chaincode (Asset Transfer)
./network.sh deployCC -ccn basic -ccp ./chaincode/asset-transfer -ccv 1.0
```

This command will:
1. Build the Docker image for the chaincode
2. Run the chaincode container (named `basic_1.0`)
3. Install the connection profile on the Peer
4. Approve, Commit, and Init the chaincode

Verify chaincode operation:
```bash
# Query all assets
docker exec cli peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}'
```

### 8. Shutdown the Network

```bash
./network.sh down
```

This command will remove all containers, volumes, and artifacts (including crypto material).

## References

- [Detailed Guide on CCAAS and Debugging](docs/CCAAS_THEORY_AND_PRACTICE.md): Read this document to understand the Chaincode-as-a-Service architecture and how to troubleshoot network issues.

### 9. Restart the Network

```bash
./network.sh restart
```

## Connection Information

### Orderers
- orderer1.example.com:7050 (Admin: 7053)
- orderer2.example.com:8050 (Admin: 8053)
- orderer3.example.com:9050 (Admin: 9053)

### Peers (Org1)
- peer0.org1.example.com:7051
- peer1.org1.example.com:8051
- peer2.org1.example.com:9051

### Certificate Authorities
- ca-org1: localhost:7054
- ca-orderer: localhost:9054

## Using CLI

You can access the CLI container to execute peer commands:

```bash
docker exec -it cli bash
```

Inside the CLI container, you can:

```bash
# Check joined channels
peer channel list

# Query chaincode
peer chaincode query -C mychannel -n mycc -c '{"Args":["query","a"]}'

# Invoke chaincode
peer chaincode invoke -o orderer1.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n mycc -c '{"Args":["invoke","a","b","10"]}'
```

## Troubleshooting

### Check Logs
```bash
docker logs -f peer0.org1.example.com
docker logs -f orderer1.example.com
```

### Full Cleanup
```bash
./network.sh down
docker system prune -a --volumes
```

### Check Network
```bash
docker network ls | grep fabric_network
```

## Notes

- The network uses TLS for all connections.
- Raft consensus requires at least 2/3 orderers to be active.
- All crypto material is auto-generated by Fabric CA.
- The channel is created with the profile "ChannelUsingRaft".

---

# AMS Backend API

RESTful API Gateway connecting Frontend to Hyperledger Fabric Blockchain.

## Technology
*   **Language**: Go 1.24+
*   **Web Framework**: Fiber v2
*   **Blockchain SDK**: Fabric Gateway Client for Go

## Structure
```
backend/
├── fabric/       # Blockchain connection logic (Client, Identity, Signing)
├── main.go       # API Entrypoint (Routes, Handlers)
└── go.mod        # Dependency Management
```

## Running Instructions

**Prerequisites**:
1.  Fabric Network (`../network`) must be running.
2.  Chaincode `basic` must be deployed.

**Execution**:
```bash
cd backend
go run main.go
```

## API Endpoints

### 1. Health Check
*   **URL**: `GET /api/health`
*   **Response**: `{"status": "ok"}`

### 2. Get All Assets
*   **URL**: `GET /api/assets`
*   **Response**: List of all assets from the Blockchain.

### 3. Create Asset
*   **URL**: `POST /api/assets`
*   **Body**:
    ```json
    {
        "id": "asset01",
        "name": "VinFast VF9",
        "type": "Vehicle",
        "owner": "Mr. V",
        "value": 85000,
        "status": "Available",
        "metadata_url": "http://ipfs.io/vf9.json"
    }
    ```
*   **Logic**:
    1.  Calculate SHA-256 Hash from `metadata_url` + `name` (Simulating file hash calculation).
    2.  Submit `CreateAsset` transaction to Blockchain with the generated Hash.

### 6. Admin Service (Protected)
Requires JWT Token with `role: Admin`.

*   **Dashboard Stats**:
    *   **URL**: `GET /api/protected/admin/dashboard`
    *   **Response**: `{"total_users": 10, "total_assets": 50, "pending_transfers": 2}`

*   **Manage Users**:
    *   **URL**: `GET /api/protected/admin/users`
    *   **Response**: List of users with wallet status and identity details.

---

# AMS Frontend Web App

Modern user interface for managing assets on the Blockchain.

## Technology
*   **Framework**: React (Vite) + TypeScript
*   **Styling**: Tailwind CSS (Glassmorphism Design)
*   **Icons**: Lucide-React
*   **Integration**: Axios (connects to Backend API)

## Structure
```
frontend/
├── src/
│   ├── components/  # Navbar, AssetCard
│   ├── pages/       # Dashboard, CreateAsset
│   ├── services/    # API Logic
│   └── types.ts     # Data Models
└── vite.config.ts   # Proxy Config (/api -> localhost:3000)
```

## Running Instructions

1.  Ensure **Backend** is running (`cd backend && go run main.go`).
2.  Run Frontend:
    ```bash
    cd frontend
    npm run dev
    ```
3.  Access: `http://localhost:5173`

## Features
*   **Asset Portfolio**: View assets visually as cards.
*   **Integrity Check**: Display on-chain metadata Hash to prove integrity.

---

# 🗄️ Database Schema & Management

## Overview

The AMS system uses **PostgreSQL** as an off-chain data store to enable rich querying capabilities that are not efficient on the blockchain ledger directly.

## Schema Structure

### `users` table
Stores basic user identity and roles, synced from user enrollment and registration.

```sql
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    identity_number VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL, -- User, Admin, Auditor
    wallet_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Active' -- Active, Locked
);
```

### `assets` table
Stores the current state of all assets.

```sql
CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    owner VARCHAR(255) REFERENCES users(id),
    status VARCHAR(50) NOT NULL, -- Available, Locked, etc.
    metadata_url TEXT,
    metadata_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### `asset_history` table
An append-only log of all changes to assets for auditing.

```sql
CREATE TABLE IF NOT EXISTS asset_history (
    tx_id VARCHAR(255) NOT NULL,
    asset_id VARCHAR(255) REFERENCES assets(id),
    action_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, TRANSFER
    old_owner VARCHAR(255),
    new_owner VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (tx_id, asset_id)
);
```

### `pending_transfers` table
Tracks multi-sig transfer requests that are waiting for approval.

```sql
CREATE TABLE IF NOT EXISTS pending_transfers (
    id SERIAL PRIMARY KEY,
    asset_id VARCHAR(255) REFERENCES assets(id),
    current_owner VARCHAR(255) REFERENCES users(id),
    new_owner VARCHAR(255) REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);
```

## Sync Mechanism
The backend runs a **Block Listener** (`backend/sync/listener.go`) that subscribes to Chaincode events and updates these tables in real-time.

1. `AssetCreated` -> INSERT into `assets`
2. `AssetUpdated` -> UPDATE `assets`
3. `AssetTransferred` -> UPDATE `assets` owner
4. `UserStatusUpdated` -> UPDATE `users` status
