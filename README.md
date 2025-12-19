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
├── backend/              # Backend API Service (Golang)
│   ├── fabric/           # SDK Client kết nối Ledger
│   ├── sync/             # Service đồng bộ Ledger sang SQL
│   └── main.go           # Entry point
├── frontend/             # Web Application (React + Vite + Tailwind)
│   ├── src/              # Source code components, pages, services
│   └── Dockerfile        # Cấu hình container hóa Frontend
├── database/             # Database Off-chain (PostgreSQL)
│   └── schema.sql        # Cấu trúc bảng (Users, History...)
├── network/              # Core Hyperledger Fabric Network
│   ├── chaincode/        # Smart Contracts (Asset Transfer)
│   ├── docker/           # Docker Compose cho Peers/Orderers/CAs
│   ├── network.sh        # Script quản lý vòng đời mạng lưới
│   ├── test_network.sh   # Script e2e testing
│   └── configtx.yaml     # Cấu hình Channel
├── scripts/              # Utility Scripts (Deploy, Create Channel...)
├── bin/                  # Fabric Binaries
├── config/               # Fabric Core Configs
├── builders/             # CCAAS External Builders
└── docker-compose-app.yaml # Orchestration cho App (BE + FE + DB)
```

## 🚀 Hướng dẫn bắt đầu (Quick Start)

### 1. Yêu cầu hệ thống
*   Docker & Docker Compose
*   Go (Golang) v1.20+

### 2. Quy trình "Fresh Start" (Khởi chạy sạch)

Để đảm bảo hệ thống chạy ổn định nhất, hãy làm theo quy trình Clean & Re-deploy đầy đủ sau:

**Bước 1: Dọn dẹp hệ thống cũ**
```bash
# Tại thư mục gốc ams/
docker-compose -f docker-compose-app.yaml down
docker system prune -f --volumes # Xóa container và volume rác

cd network
# Tắt mạng lưới Fabric và xóa crypto material cũ
./network.sh down
```

**Bước 2: Khởi động Mạng lưới Fabric**
```bash
# Tại thư mục network/
./network.sh up
./network.sh createChannel -c mychannel
```

**Bước 3: Deploy Chaincode (CCAAS)**
```bash
./network.sh deployCC -ccn basic -ccp ./chaincode/asset-transfer -ccv 1.0 -ccs 1
```

**Bước 4: Khởi chạy Ứng dụng (App)**
```bash
cd .. # Quay lại thư mục gốc ams/
docker-compose -f docker-compose-app.yaml up --build -d
```

**Bước 5: Kiểm tra Truy cập**
*   **Frontend**: [http://localhost:5173](http://localhost:5173)
*   **Backend Health**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

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

#### **Giai đoạn 3: Nâng cấp Kiến trúc Hybrid ✅ Completed**
*   **Mục tiêu**: Giải quyết bài toán hiệu năng truy vấn (Query Performance) và khả năng tìm kiếm nâng cao (Explorer).
*   **Kiến trúc Đã triển khai**:
    1.  **On-chain (CouchDB)**:
        *   Fabric Peers hiện sử dụng **CouchDB** thay vì LevelDB.
        *   Hỗ trợ **Rich Queries** (JSON Selector) trong Chaincode.
    2.  **Off-chain (PostgreSQL)**:
        *   Database: `postgres:15-alpine` chạy trên cổng 5432.
        *   Schema: Định nghĩa tại `database/schema.sql` (Assets, Users, History).
    3.  **Sync Service (Block Listener)**:
        *   Một dịch vụ chạy ngầm trong Backend (`backend/sync/listener.go`).
        *   Lắng nghe sự kiện Chaincode (`AssetCreated`, `AssetUpdated`, `AssetTransferred`).
        *   Tự động đồng bộ dữ liệu từ Ledger sang SQL trong thời gian thực (< 3s).
    4.  **Lợi ích**:
        *   Giảm tải cho Blockchain Gateway.
        *   Cho phép thực hiện các truy vấn phức tạp (JOIN, Sort, Group By) phục vụ **Public Explorer**.

---

## �📚 Tài liệu tham khảo

*   [Chi tiết về Network & Debugging](network/README.md)
*   [Lý thuyết CCAAS & Troubleshooting](network/docs/CCAAS_THEORY_AND_PRACTICE.md)
