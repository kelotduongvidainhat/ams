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
### 6. Chạy ứng dụng với Docker (Containerization)

Hệ thống hỗ trợ chạy Backend và Frontend trong Docker container, giúp triển khai dễ dàng và đồng nhất.

**Bước 1: Khởi động mạng lưới (nếu chưa chạy)**
```bash
cd network
./network.sh up createChannel -c mychannel
./network.sh deployCC -ccn basic -ccp ./chaincode/asset-transfer -ccv 1.0 -ccs 1
```

**Bước 2: Build và chạy ứng dụng**
Tại thư mục gốc `ams/`:
```bash
docker-compose -f docker-compose-app.yaml up --build -d
```

**Bước 3: Truy cập**
*   **Web App**: [http://localhost:5173](http://localhost:5173) (User: `user01` / `admin`)
*   **Backend API**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

**Lưu ý:**
*   Container Backend (`ams-backend`) tự động kết nối với mạng Fabric (`fabric_network`).
*   Frontend sử dụng **Nginx Reverse Proxy**:
    *   Route `/` -> Serve React App (Port 5173).
    *   Route `/api` -> Proxy pass to `ams-backend:3000`.
*   Nếu bạn đang chạy backend cục bộ (cổng 3000), hãy tắt nó trước khi chạy Docker để tránh xung đột cổng (`fuser -k 3000/tcp`).
*   Volume `/crypto` được mount tự động từ thư mục `network/organizations`.

##  Thiết kế Hệ thống Mở rộng (System Design Spec)

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

### 4. Quản lý Quyền truy cập & Bảo mật (Access Control & Security)
Hệ thống sử dụng mô hình kết hợp **RBAC** (Role-Based) và **ABAC** (Attribute-Based) để kiểm soát quyền truy cập tài sản.

*   **Role-Based (Vai trò):**
    *   `Admin`: Có quyền xem **toàn bộ** tài sản và giao dịch trên mạng lưới.
    *   `Owner`: Có quyền xem, chuyển nhượng (Transfer) và chia sẻ (Grant Access) tài sản mình sở hữu.
    *   `Auditor`: Có quyền xem lịch sử giao dịch để kiểm toán (Compliance).
    *   `Viewer`: Người dùng được cấp quyền xem tài sản cụ thể.

*   **Attribute-Based (Thuộc tính):**
    *   Mỗi tài sản có danh sách `viewers`: Danh sách UserID được phép xem.
    *   Cơ chế **Private by Default**: Tài sản khi tạo mới chỉ Owner nhìn thấy.

### 5. Truy xuất Nguồn gốc (Asset Provenance)
Lưu trữ toàn bộ lịch sử vòng đời của tài sản (Chain of Custody).

*   **History Records**:
    *   Mỗi bản ghi chứa: `TxID`, `Timestamp`, `Asset State Snapshot`.
    *   Cho phép người dùng xem lại quá trình chuyển nhượng: Từ ai -> Sang ai -> Vào lúc nào.

### 6. Chiến lược Dữ liệu (Data Strategy: On-chain vs Off-chain)

Để tối ưu hóa hiệu năng và đảm bảo tính toàn vẹn, hệ thống phân chia dữ liệu như sau:

| Loại Dữ liệu | Vị trí Lưu trữ | Chi tiết | Lý do |
| :--- | :--- | :--- | :--- |
| **Định danh & Trạng thái** | **On-chain** | `asset_id`, `docType`, `owner`, `status` | Cần thiết cho logic xác thực giao dịch (Validation Logic) của Chaincode. |
| **Quyền truy cập** | **On-chain** | `viewers` (Array) | Kiểm soát ai được phép Query dữ liệu (World State Read). |
| **Bằng chứng xác thực** | **On-chain** | `metadata_hash` (SHA-256) | Đảm bảo dữ liệu Off-chain không bị sửa đổi trái phép. |
| **Lịch sử Giao dịch** | **On-chain** | `tx_id`, `timestamp`, `history` | Truy xuất nguồn gốc (Provenance) và kiểm toán. |
| **Nội dung Chi tiết** | **Off-chain** | Hình ảnh, Video, Tài liệu PDF | Giảm tải cho Ledger, tiết kiệm tài nguyên mạng. |

### 7. Tại sao cần `metadata_hash` và Cách tạo?

**Q: Tại sao cần lưu Hash trên On-chain khi đã có URL?**
**A:** Để đảm bảo tính toàn vẹn (Data Integrity).
*   **Vấn đề:** Dữ liệu tại `metadata_url` (nằm Off-chain) có thể bị hacker hoặc admin hệ thống âm thầm sửa đổi.
*   **Giải pháp:** `metadata_hash` đóng vai trò như "dấu vân tay" kỹ thuật số bất biến trên Blockchain.

### 8. Lộ trình Phát triển (Development Roadmap)

Hệ thống đã hoàn thiện các module cốt lõi (MVP Completed):

#### **Giai đoạn 1: Backend API Gateway (Golang) ✅ Completed**
*   **Mục tiêu**: Cung cấp RESTful API bảo mật.
*   **Chức năng**:
    *   `GET /api/assets?user_id=...`: Lọc tài sản theo quyền hạn (Admin/Owner/Viewer).
    *   `POST /api/assets/:id/access`: Cấp quyền xem (Grant Access).
    *   `GET /api/assets/:id/history`: Truy xuất lịch sử.
    *   *Documentation*: Xem chi tiết tại [backend/README.md](backend/README.md).

#### **Giai đoạn 2: Frontend Web App ✅ Completed**
*   **Mục tiêu**: Giao diện người dùng trực quan.
*   **Chức năng**:
    *   **Login Flow**: Đăng nhập với UserID (Simulation).
    *   **Dashboard**: Hiển thị tài sản với chỉ báo quyền sở hữu `(You)`.
    *   **Transfer**: Chuyển nhượng tài sản (chỉ Owner).
    *   **Sharing**: Chia sẻ quyền xem cho user khác.
    *   **History**: Timeline trực quan về lịch sử tài sản.
    *   *Documentation*: Xem chi tiết tại [frontend/README.md](frontend/README.md).

---

## �📚 Tài liệu tham khảo

*   [Chi tiết về Network & Debugging](network/README.md)
*   [Lý thuyết CCAAS & Troubleshooting](network/docs/CCAAS_THEORY_AND_PRACTICE.md)
