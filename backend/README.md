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
