# AMS - Asset Management System (Hyperledger Fabric)

Dự án triển khai mạng lưới blockchain riêng tư sử dụng **Hyperledger Fabric v2.5** với mô hình triển khai Chaincode hiện đại **Chaincode-as-a-Service (CCAAS)**.

## 🌟 Tính năng nổi bật

*   **Kiến trúc mạng lưới**: 1 Organization, 3 Orderers (Raft Consensus), 3 Peers.
*   **Chaincode-as-a-Service (CCAAS)**: Chaincode chạy dưới dạng Docker container độc lập, loại bỏ sự phụ thuộc vào Docker-in-Docker của Peer, tăng tính ổn định và dễ dàng debug.
*   **Tự động hóa**: Scripts thông minh tự động hóa toàn bộ quy trình từ khởi tạo mạng, tạo channel đến deploy chaincode.
*   **Asset Management**: Tích hợp sẵn chaincode quản lý tài sản cơ bản (Create, Read, Update, Delete).

## 📂 Cấu trúc dự án

```
ams/
├── bin/                  # Các file thực thi của Fabric (peer, orderer, configtxgen...)
├── config/               # Cấu hình lõi của Fabric (core.yaml, orderer.yaml)
├── network/              # Cấu hình mạng lưới & Docker Compose
│   ├── network.sh        # Script chính quản lý toàn bộ mạng lưới
│   ├── docker/           # File docker-compose cho node và CA
│   ├── configtx.yaml     # Cấu hình channel và genesis block
│   └── docs/             # Tài liệu kỹ thuật chi tiết
├── scripts/              # Các script tiện ích (được gọi bởi network.sh)
│   ├── deployCCAAS.sh    # Logic deploy CCAAS
│   ├── createChannel.sh  # Logic tạo channel
│   └── ...
└── builders/             # External builders (dùng cho CCAAS)
```

## 🚀 Hướng dẫn bắt đầu (Quick Start)

### 1. Yêu cầu hệ thống
*   Docker & Docker Compose
*   Go (Golang) v1.20+
*   Quyền truy cập Internet (để pull Docker images)

### 2. Khởi động mạng lưới

Di chuyển vào thư mục `network`:

```bash
cd network
```

Dọn dẹp môi trường cũ (nếu có) và khởi động mạng lưới mới:

```bash
# Dọn dẹp sạch sẽ (cần sudo để xóa các file crypto do docker tạo)
sudo ./network.sh down

# Khởi động mạng lưới (Peers, Orderers, CAs)
./network.sh up
```

### 3. Tạo Channel

Tạo channel mặc định tên là `mychannel`:

```bash
./network.sh createChannel -c mychannel
```

### 4. Triển khai Chaincode (CCAAS)

Deploy chaincode `basic` (Asset Transfer) với version 1.0:

```bash
./network.sh deployCC -ccn basic -ccp ./chaincode/asset-transfer -ccv 1.0 -ccs 1
```

Script sẽ tự động:
1.  Build Docker image cho chaincode.
2.  Chạy container chaincode.
3.  Cài đặt, Approve và Commit chaincode lên mạng lưới.
4.  Khởi tạo (Init) ledger.

### 5. Kiểm tra kết quả

Query danh sách tài sản để xác nhận chaincode hoạt động:

```bash
docker exec cli peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}'
```

## 📚 Tài liệu tham khảo

*   [Chi tiết về Network & Debugging](network/README.md)
*   [Lý thuyết CCAAS & Troubleshooting](network/docs/CCAAS_THEORY_AND_PRACTICE.md)
