# Hyperledger Fabric Network - 1 Org, 3 Orderers, 3 Peers

Mạng lưới Hyperledger Fabric với cấu hình:
- **1 Organization**: Org1
- **3 Orderers**: orderer1, orderer2, orderer3 (Raft consensus)
- **3 Peers**: peer0, peer1, peer2 (thuộc Org1)

## Cấu trúc thư mục

```
network/
├── configtx.yaml                 # Cấu hình channel và genesis block
├── network.sh                    # Script quản lý mạng lưới
├── docker/
│   ├── docker-compose.yaml       # Docker compose cho peers và orderers
│   └── docker-compose-ca.yaml    # Docker compose cho Certificate Authorities
├── organizations/                # Chứa crypto material (sẽ được tạo tự động)
├── channel-artifacts/            # Chứa channel artifacts
└── system-genesis-block/         # Chứa genesis block

scripts/                          # (Thư mục gốc)
├── registerEnroll.sh             # Script đăng ký và enroll identities
├── createChannel.sh              # Script tạo channel
├── deployCC.sh                   # Script deploy chaincode
├── deployCCAAS.sh                # Script deploy CCAAS
└── envVar.sh                     # Biến môi trường
```

## Yêu cầu

- Docker và Docker Compose
- Hyperledger Fabric binaries (fabric-ca-client, configtxgen, peer, osnadmin)

## Cài đặt Fabric binaries

```bash
cd /home/sleep/ams
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.9 1.5.12 -d -s
```

## Hướng dẫn sử dụng

### 1. Khởi động mạng lưới

```bash
cd network
chmod +x network.sh ../scripts/*.sh
./network.sh up
```

Lệnh này sẽ:
- Khởi động 2 Certificate Authority servers (cho Org1 và Orderer Org)
- Tạo crypto material cho tất cả peers và orderers
- Khởi động 3 orderers và 3 peers


### 3. Mô hình Dữ liệu (Asset Structure)

Smart Contract (`basic`) đã được cập nhật để hỗ trợ mô hình tài sản tổng quát cho thương mại:

```go
type Asset struct {
    ID     string `json:"ID"`
    Name   string `json:"name"`   // Ví dụ: "iPhone 15 Pro"
    Type   string `json:"type"`   // Ví dụ: "Electronics", "RealEstate"
    Owner  string `json:"owner"`  // Ví dụ: "Tomoko"
    Value  int    `json:"value"`  // Giá trị định giá
    Status string `json:"status"` // Ví dụ: "Available", "Sold"
}
```

### 4. Vận hành & Kiểm thử

#### Kiểm thử nhanh
Sử dụng script `test_network.sh` để chạy kịch bản kiểm thử tự động (Query, Create, Transfer):

```bash
cd network
./test_network.sh
```

#### Các lệnh thủ công

### 5. Tạo và join channel

```bash
./network.sh createChannel -c mychannel
```

**Lưu ý**: Nếu gặp lỗi khi join peer1 và peer2, chạy lệnh sau để join thủ công:

```bash
docker exec -e CORE_PEER_ADDRESS=peer1.org1.example.com:8051 cli peer channel join -b ./channel-artifacts/mychannel.block
docker exec -e CORE_PEER_ADDRESS=peer2.org1.example.com:9051 cli peer channel join -b ./channel-artifacts/mychannel.block
```

### 6. Kiểm tra trạng thái mạng lưới

```bash
chmod +x check-status.sh
./check-status.sh
```

Script này sẽ hiển thị:
- Trạng thái tất cả containers
- Thông tin channel
- Trạng thái từng peer
- Trạng thái từng orderer

### 4. Kiểm tra trạng thái thủ công

```bash
# Xem các containers đang chạy
docker ps

# Kiểm tra channels mà peer đã join
docker exec cli peer channel list

# Kiểm tra thông tin channel
docker exec cli peer channel getinfo -c mychannel

# Xem logs của một container cụ thể
docker logs peer0.org1.example.com
docker logs orderer1.example.com
```

### 5. Deploy Chaincode (Sử dụng Chaincode-as-a-Service)

Hệ thống sử dụng mô hình CCAAS (Chaincode-as-a-Service) để tránh lỗi build Docker-in-Docker. Chaincode chạy dưới dạng Docker container riêng biệt.

```bash
# Deploy chaincode cơ bản (Asset Transfer)
./network.sh deployCC -ccn basic -ccp ./chaincode/asset-transfer -ccv 1.0
```

Lệnh này sẽ:
1. Build Docker image cho chaincode
2. Chạy container chaincode (tên `basic_1.0`)
3. Cài đặt connection profile lên Peer
4. Approve, Commit và Init chaincode

Kiểm tra chaincode hoạt động:
```bash
# Query tất cả tài sản
docker exec cli peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}'
```

### 6. Tắt mạng lưới

```bash
./network.sh down
```

Lệnh này sẽ xóa toàn bộ container, volumes và artifacts (bao gồm cả crypto material).

## Tài liệu tham khảo

- [Hướng dẫn chi tiết về CCAAS và Quá trình Debug](docs/CCAAS_THEORY_AND_PRACTICE.md): Đọc tài liệu này để hiểu sâu về kiến trúc Chaincode-as-a-Service và cách khắc phục các lỗi mạng lưới.



Lệnh này sẽ dọn dẹp tất cả containers, volumes và crypto material.

### 5. Khởi động lại mạng lưới

```bash
./network.sh restart
```

## Thông tin kết nối

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

## Sử dụng CLI

Bạn có thể truy cập vào CLI container để thực hiện các lệnh peer:

```bash
docker exec -it cli bash
```

Trong CLI container, bạn có thể:

```bash
# Kiểm tra channel đã join
peer channel list

# Query chaincode
peer chaincode query -C mychannel -n mycc -c '{"Args":["query","a"]}'

# Invoke chaincode
peer chaincode invoke -o orderer1.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n mycc -c '{"Args":["invoke","a","b","10"]}'
```

## Troubleshooting

### Kiểm tra logs
```bash
docker logs -f peer0.org1.example.com
docker logs -f orderer1.example.com
```

### Dọn dẹp hoàn toàn
```bash
./network.sh down
docker system prune -a --volumes
```

### Kiểm tra network
```bash
docker network ls | grep fabric_network
```

## Lưu ý

- Mạng lưới sử dụng TLS cho tất cả các kết nối
- Raft consensus yêu cầu ít nhất 2/3 orderers hoạt động
- Tất cả crypto material được tạo tự động bởi Fabric CA
- Channel được tạo với profile "ChannelUsingRaft"


---


# AMS Backend API

RESTful API Gateway kết nối Frontend với Hyperledger Fabric Blockchain.

## Công nghệ
*   **Language**: Go 1.24+
*   **Web Framework**: Fiber v2
*   **Blockchain SDK**: Fabric Gateway Client for Go

## Cấu trúc
```
backend/
├── fabric/       # Logic kết nối Blockchain (Client, Identity, Signing)
├── main.go       # API Entrypoint (Routes, Handlers)
└── go.mod        # Dependency Management
```

## Hướng dẫn Chạy

**Tiền đề**:
1.  Mạng lưới Fabric (`../network`) phải đang chạy.
2.  Chaincode `basic` đã được deploy.

**Thực thi**:
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
*   **Response**: Danh sách toàn bộ tài sản từ Blockchain.

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
    1.  Tính SHA-256 Hash từ `metadata_url` + `name` (Giả lập logic tính hash file).
    2.  Gửi giao dịch `CreateAsset` lên Blockchain với Hash vừa tạo.

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

Giao diện người dùng hiện đại quản lý tài sản trên Blockchain.

## Công nghệ
*   **Framework**: React (Vite) + TypeScript
*   **Styling**: Tailwind CSS (Glassmorphism Design)
*   **Icons**: Lucide-React
*   **Integration**: Axios (connects to Backend API)

## Cấu trúc
```
frontend/
├── src/
│   ├── components/  # Navbar, AssetCard
│   ├── pages/       # Dashboard, CreateAsset
│   ├── services/    # API Logic
│   └── types.ts     # Data Models
└── vite.config.ts   # Proxy Config (/api -> localhost:3000)
```

## Hướng dẫn Chạy

1.  Đảm bảo **Backend** đang chạy (`cd backend && go run main.go`).
2.  Chạy Frontend:
    ```bash
    cd frontend
    npm run dev
    ```
3.  Truy cập: `http://localhost:5173`

## Tính năng
*   **Asset Portfolio**: Xem danh sách tài sản trực quan dạng thẻ.
*   **Integrity Check**: Hiển thị Hash metadata on-chain để chứng minh tính toàn vẹn.


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
