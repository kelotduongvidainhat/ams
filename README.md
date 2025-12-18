# AMS - Asset Management System (Hyperledger Fabric)

Dự án triển khai mạng lưới blockchain riêng tư sử dụng **Hyperledger Fabric v2.5** với mô hình triển khai Chaincode hiện đại **Chaincode-as-a-Service (CCAAS)**.

## 🌟 Tính năng nổi bật

*   **Kiến trúc mạng lưới**: 1 Organization, 3 Orderers (Raft Consensus), 3 Peers.
*   **Chaincode-as-a-Service (CCAAS)**: Chaincode chạy dưới dạng Docker container độc lập, loại bỏ sự phụ thuộc vào Docker-in-Docker của Peer, tăng tính ổn định và dễ dàng debug.
*   **Tự động hóa**: Scripts thông minh tự động hóa toàn bộ quy trình từ khởi tạo mạng, tạo channel đến deploy chaincode.
*   **Asset Management**: Tích hợp sẵn chaincode quản lý tài sản thương mại (ID, Name, Type, Owner, Value, Status).

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

*> Lưu ý: Lệnh `down` sẽ tự động xóa cả Docker containers và chaincode images (`basic_image`) để đảm bảo môi trường sạch.*

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
Bạn có thể sử dụng script kiểm thử tự động (Recommended):

```bash
./test_network.sh
```

Hoặc chạy lệnh thủ công:
```bash
docker exec cli peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}'
```

## � Thiết kế Hệ thống Mở rộng (System Design Spec)

Dưới đây là đặc tả mô hình dữ liệu cho các phiên bản phát triển tiếp theo:

### 1. Thực thể Người dùng & Tổ chức (Users & Organizations)
Quản lý các bên tham gia vào mạng lưới (Chủ sở hữu, Cơ quan quản lý, Công chứng viên).

*   **Users (Người dùng)**
    *   `user_id` (PK): Định danh duy nhất.
    *   `full_name`: Tên đầy đủ.
    *   `identity_number`: Số CCCD/Passport.
    *   `wallet_address`: Địa chỉ ví Blockchain (dùng để ký giao dịch).
    *   `role_id` (FK): Liên kết với bảng vai trò.

*   **Roles (Vai trò)**
    *   `role_id` (PK): Admin, Owner, Validator (Người xác thực), v.v.

### 2. Thực thể Tài sản (Assets)
Tài sản có thể là Đất đai, Xe cộ, hoặc Tranh ảnh nghệ thuật.

*   **Assets (Tài sản)**
    *   `asset_id` (PK): Mã tài sản trên hệ thống.
    *   `asset_type`: Loại tài sản (Land, Vehicle, Art).
    *   `metadata_url`: Đường dẫn đến file chứa thông tin chi tiết (JSON Off-chain).
    *   `metadata_hash`: Mã băm SHA-256 của file metadata (Integrity Check).
    *   `current_owner_id` (FK): Liên kết với Users.
    *   `status`: Trạng thái (Active, Pending Transfer, Frozen).
    *   `blockchain_tx_hash`: Mã giao dịch khởi tạo trên Blockchain.

*   **Asset_Details** (Chi tiết tài sản): Tạm thời quản lý qua Metadata URL hoặc tách bảng tùy loại.

### 3. Thực thể Giao dịch & Chuyển nhượng (Transactions)
Lưu trữ lịch sử thay đổi chủ sở hữu và chứng thực.

*   **Transactions (Giao dịch)**
    *   `tx_id` (PK): Mã giao dịch hệ thống.
    *   `asset_id` (FK): Tài sản giao dịch.
    *   `from_user_id` (FK): Người bán/chuyển nhượng.
    *   `to_user_id` (FK): Người mua/nhận.
    *   `validator_id` (FK): Cơ quan phê duyệt (đối với mạng Permissioned).
    *   `timestamp`: Thời gian thực hiện.
    *   `blockchain_status`: Trạng thái (Pending, Confirmed, Failed).
    *   `smart_contract_address`: Địa chỉ hợp đồng thực thi.

### 4. Chiến lược Dữ liệu (Data Strategy: On-chain vs Off-chain)

Để tối ưu hóa hiệu năng và đảm bảo tính toàn vẹn, hệ thống phân chia dữ liệu như sau:

| Loại Dữ liệu | Vị trí Lưu trữ | Chi tiết | Lý do |
| :--- | :--- | :--- | :--- |
| **Định danh & Trạng thái** | **On-chain** | `asset_id`, `owner`, `status`, `asset_type` | Cần thiết cho logic xác thực giao dịch (Validation Logic) của Chaincode. |
| **Bằng chứng xác thực** | **On-chain** | `metadata_hash` (SHA-256) | Đảm bảo dữ liệu Off-chain không bị sửa đổi trái phép. |
| **Lịch sử Giao dịch** | **On-chain** | `tx_id`, `timestamp`, `from/to` | Truy xuất nguồn gốc (Provenance) và kiểm toán. |
| **Nội dung Chi tiết** | **Off-chain** | Hình ảnh, Video, Tài liệu PDF, Mô tả dài | Giảm tải cho Ledger, tiết kiệm tài nguyên mạng. |
| **Dữ liệu Nhạy cảm** | **Off-chain** | Thông tin cá nhân chi tiết (PII) | Tuân thủ quyền riêng tư (GDPR), chỉ lưu Hash trên chain. |

> **Cơ chế hoạt động:**
> 1.  Dữ liệu chi tiết được upload lên Off-chain Storage (IPFS/S3).
> 2.  Hệ thống lấy URL và tạo Hash của dữ liệu đó.
> 3.  Gửi giao dịch lên Blockchain chứa: `ID`, `Owner`, `URL`, `Hash`.
> 4.  Khi cần kiểm tra, Client tải dữ liệu từ URL, hash lại và so sánh với Hash trên On-chain.

### 5. Tại sao cần `metadata_hash` và Cách tạo?

**Q: Tại sao cần lưu Hash trên On-chain khi đã có URL?**
**A:** Để đảm bảo tính toàn vẹn (Data Integrity).
*   **Vấn đề:** Dữ liệu tại `metadata_url` (nằm Off-chain) có thể bị hacker hoặc admin hệ thống âm thầm sửa đổi.
*   **Giải pháp:** `metadata_hash` đóng vai trò như "dấu vân tay" kỹ thuật số bất biến trên Blockchain.
    *   Nếu nội dung file Off-chain bị sửa dù chỉ 1 dấu phẩy, Hash mới sẽ **KHÁC** Hash lưu trên Chain.
    *   Người dùng sẽ phát hiện ngay dữ liệu đã bị làm giả.

**Q: Cách tạo `metadata_hash` như thế nào?**
Sử dụng thuật toán **SHA-256** (tiêu chuẩn công nghiệp).

**Ví dụ minh họa:**
1.  Giả sử nội dung file `asset_detail.json`:
    ```json
    {
      "color": "red",
      "model": "2024"
    }
    ```
2.  Tạo Hash (SHA-256):
    *   **Linux/Mac**: `sha256sum asset_detail.json` hoặc `echo -n '{"color": "red",...}' | shasum -a 256`
    *   **Kết quả**: `a3b4c5...` (chuỗi 64 ký tự hex)
3.  Lưu chuỗi `a3b4c5...` này vào trường `metadata_hash` trong Chaincode.

### 6. Lộ trình Phát triển (Next Steps)

Hệ thống Blockchain Core đã hoàn thiện. Các bước tiếp theo tập trung vào xây dựng ứng dụng (Application Layer):

#### **Giai đoạn 1: Backend API Gateway (Golang) ✅ Completed**
*   **Mục tiêu**: Cung cấp RESTful API cho Frontend, ẩn đi sự phức tạp của Blockchain.
*   **Stack**: Golang + Fabric SDK Go + Fiber/Gin Web Framework.
*   **Chức năng chính**:
    *   `POST /api/assets`: Upload file (lưu Local/S3) -> Hash SHA-256 -> Submit Transaction lên Blockchain.
    *   `GET /api/assets/:id`: Query dữ liệu từ Blockchain + Load file từ URL Off-chain.
    *   *Documentation*: Xem chi tiết tại [backend/README.md](backend/README.md).

#### **Giai đoạn 2: Frontend Web App ✅ Completed**
*   **Mục tiêu**: Giao diện người dùng hiện đại, trực quan.
*   **Stack**: ReactJS (Vite) hoặc Next.js.
*   **Aesthetics**: Dashboard quản lý tài sản, hiển thị minh bạch Hash On-chain vs Hash thực tế.
*   *Documentation*: Xem chi tiết tại [frontend/README.md](frontend/README.md).

---

## �📚 Tài liệu tham khảo

*   [Chi tiết về Network & Debugging](network/README.md)
*   [Lý thuyết CCAAS & Troubleshooting](network/docs/CCAAS_THEORY_AND_PRACTICE.md)
