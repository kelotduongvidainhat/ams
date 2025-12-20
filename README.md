# AMS - Asset Management System (Hyperledger Fabric)

Dự án triển khai mạng lưới blockchain riêng tư sử dụng **Hyperledger Fabric v2.5** với mô hình triển khai Chaincode hiện đại **Chaincode-as-a-Service (CCAAS)**.

## 🌟 Tính năng nổi bật

*   **Kiến trúc mạng lưới**: 1 Organization, 3 Orderers (Raft Consensus), 3 Peers.
*   **Chaincode-as-a-Service (CCAAS)**: Chaincode chạy dưới dạng Docker container độc lập, loại bỏ sự phụ thuộc vào Docker-in-Docker của Peer, tăng tính ổn định và dễ dàng debug.
*   **Tự động hóa**: Scripts thông minh tự động hóa toàn bộ quy trình từ khởi tạo mạng, tạo channel đến deploy chaincode.
*   **Asset Management**: Tích hợp sẵn chaincode quản lý tài sản thương mại (ID, Name, Type, Owner, Status, Metadata).
*   **Multi-Signature Transfers**: Chuyển giao tài sản yêu cầu xác nhận từ 2 bên (người gửi + người nhận) với thời hạn 24 giờ.
*   **Wallet-as-a-Service**: Đăng ký người dùng mới trực tiếp qua API, tự động tạo ví blockchain.

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

#### 🚀 Tự động hóa (Khuyến nghị)

Sử dụng script tự động để thực hiện toàn bộ quy trình:

```bash
# Tại thư mục gốc ams/
sudo ./scripts/fresh_start.sh
```

Script này sẽ tự động thực hiện **12 bước** bên dưới, bao gồm:
- Dọn dẹp hệ thống cũ
- Khởi động mạng Fabric + Deploy Chaincode
- Đăng ký người dùng + Tạo ví (Wallet)
- Khởi chạy ứng dụng + Khởi tạo Database
- Tạo dữ liệu mẫu (Sample Assets)
- Đồng bộ người dùng + Thiết lập mật khẩu

#### 📋 Quy trình Thủ công (Manual Steps)

Nếu bạn muốn thực hiện từng bước một, hãy làm theo hướng dẫn sau:

**Bước 1: Dọn dẹp hệ thống cũ**
```bash
# Tại thư mục gốc ams/
docker-compose -f docker-compose-app.yaml down --remove-orphans
docker system prune -f --volumes # Xóa container và volume rác

cd network
./network.sh down
cd ..

# Xóa MSP artifacts (nếu cần)
sudo rm -rf network/organizations/fabric-ca/org1/msp network/organizations/fabric-ca/ordererOrg/msp
```

**Bước 2: Khởi động Mạng lưới Fabric**
```bash
cd network
./network.sh up
./network.sh createChannel -c mychannel
```

**Bước 3: Deploy Chaincode (CCAAS)**
```bash
./network.sh deployCC -ccn basic -ccp ./chaincode/asset-transfer -ccv 1.0 -ccs 1
cd ..
```

**Bước 4: Đăng ký Danh tính Người dùng (Real Identity)**

Trước khi khởi chạy ứng dụng, bạn cần đăng ký danh tính cho các người dùng thực để tạo ví (Wallet) dùng để ký giao dịch:
```bash
chmod +x scripts/enrollUser.sh

# Đăng ký các user mẫu (Tomoko, Brad, JinSoo, Max...)
./scripts/enrollUser.sh Tomoko password
./scripts/enrollUser.sh Brad password
./scripts/enrollUser.sh JinSoo password
./scripts/enrollUser.sh Max password
./scripts/enrollUser.sh Adriana password
./scripts/enrollUser.sh Michel password
```

**Bước 5: Khởi chạy Ứng dụng (App)**
```bash
docker-compose -f docker-compose-app.yaml up -d --build
```

**Bước 6: Khởi tạo Database (Init Schema)**

Chờ khoảng 10s để container database khởi động hoàn tất, sau đó nạp cấu trúc bảng:
```bash
sleep 10
docker exec -i ams-postgres psql -U ams_user -d ams_db < database/schema.sql
```

**Bước 7: Tạo Dữ liệu Mẫu (Sample Data)**

Tạo các tài sản mẫu cho người dùng:
```bash
./scripts/create_sample_data.sh
```

**Bước 8: Tạo Người dùng Test với Mật khẩu**

Tạo tài khoản `demo_user` để test tính năng đăng nhập:
```bash
sleep 3 # Chờ backend sẵn sàng
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"id": "demo_user", "full_name": "Demo User", "identity_number": "DEMO001", "role": "User", "password": "demo123"}'
```

**Bước 9: Đồng bộ Người dùng từ Blockchain sang PostgreSQL**

Đồng bộ tất cả người dùng từ Ledger sang database Off-chain:
```bash
./scripts/sync_users.sh
```

**Bước 10: Thiết lập Mật khẩu cho Tất cả Người dùng**

Thêm mật khẩu cho các người dùng đã được đăng ký:
```bash
./scripts/add_passwords.sh
```

**Bước 11: Kiểm tra Truy cập**

*   **Frontend**: [http://localhost:5173](http://localhost:5173)
*   **Backend Health**: [http://localhost:3000/api/health](http://localhost:3000/api/health)
*   **Public Explorer**: [http://localhost:3000/api/explorer/assets](http://localhost:3000/api/explorer/assets)

**Bước 12: Test Đăng nhập**

```bash
# Test JWT Authentication
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"Tomoko","password":"tomoko123"}'

# Test Query Assets
curl "http://localhost:3000/api/assets?user_id=Tomoko"
```

#### 🔐 Thông tin Đăng nhập

Sau khi hoàn tất Fresh Start, bạn có thể đăng nhập với các tài khoản sau:

| Username | Password | Role | Wallet |
|----------|----------|------|--------|
| `demo_user` | `demo123` | User | ✓ |
| `Tomoko` | `tomoko123` | User | ✓ |
| `Brad` | `brad123` | User | ✓ |
| `JinSoo` | `jinsoo123` | User | ✓ |
| `Max` | `max123` | User | ✓ |
| `Adriana` | `adriana123` | User | ✓ |
| `Michel` | `michel123` | User | ✓ |
| `admin` | `admin123` | Admin | ✓ |
| `auditor` | `auditor123` | Auditor | ✓ |
| `user01` | `user01123` | User | ✓ |

#### 🆕 Đăng ký Người dùng Mới (Qua API - WaaS)

Bạn cũng có thể đăng ký người dùng mới trực tiếp thông qua API:

```bash
curl -X POST http://localhost:3000/api/wallet/register \
  -H "Content-Type: application/json" \
  -d '{"username": "NewUser", "password": "password", "full_name": "New User", "identity_number": "ID-NEW"}'
```

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
        *   Lắng nghe sự kiện Chaincode (`AssetCreated`, `UserCreated`, `AssetTransferred`...).
        *   Tự động đồng bộ dữ liệu từ Ledger sang SQL trong thời gian thực (< 3s).
    4.  **Luồng dữ liệu (Data & Sync Flow)**:
        *   **Write**: API -> Blockchain (On-Chain). Nếu thành công -> Emit Event.
        *   **Sync**: Event -> Block Listener -> PostgreSQL (Off-Chain).
        *   **Read**: API -> PostgreSQL (Off-Chain). Giúp giảm tải cho Ledger và tăng tốc độ phản hồi.
    5.  **Lợi ích**:
        *   Giảm tải cho Blockchain Gateway (không cần Query trưc tiếp cho các tác vụ đọc nặng).
        *   Đảm bảo tính nhất quán (Strong Consistency): DB chỉ cập nhật khi và chỉ khi Tx trên Blockchan thành công.

#### **Giai đoạn 4: Real Identity & Wallet Integration (WaaS) ✅ Completed**
*   **Mục tiêu**: Tích hợp danh tính thực (X.509 Identity) và triển khai Wallet-as-a-Service (WaaS).
*   **Thực hiện**:
    *   **Wallet-as-a-Service (WaaS)**: Backend trực tiếp giao tiếp với **Fabric CA** thông qua `fabric-ca-client` binary được nhúng sẵn trong container.
    *   **Automated Registration**: API `POST /api/wallet/register` cho phép người dùng đăng ký tài khoản tự động. Quy trình bao gồm:
        1.  Đăng ký (Register) người dùng mới với CA.
        2.  Cấp phát (Enroll) chứng chỉ X.509 và lưu vào Wallet (File System).
        3.  Tạo danh tính trên Ledger (On-Chain) ngay lập tức.
    *   **Dynamic Identity**: Mỗi API Request sẽ khởi tạo Gateway Connection riêng biệt dưới danh tính của người gọi (Acting As).
    *   **Non-repudiation**: Mọi giao dịch đều được ký bởi Private Key của chính chủ sở hữu.

#### **Giai đoạn 5: Hệ thống Xác thực Bảo mật (Authentication System) ✅ Completed**
*   **Mục tiêu**: Bảo mật API và quản lý phiên đăng nhập người dùng.
*   **Tính năng Đã triển khai**:
    1.  **Password Security**:
        *   Sử dụng thư viện `bcrypt` để mã hóa mật khẩu một chiều trước khi lưu vào PostgreSQL.
        *   Đảm bảo mật khẩu gốc không bao giờ được lưu trữ dưới dạng plain-text.
    2.  **JWT Authentication**:
        *   Triển khai tiêu chuẩn **JSON Web Token (JWT)** cho quản lý phiên.
        *   Token chứa thông tin `verify user_id` và `role`, được ký bằng Secret Key.
    3.  **Secure Endpoints**:
        *   Middleware bảo vệ các API quan trọng (`/protected/...`).
        *   Yêu cầu `Authorization: Bearer <token>` trong Header của mọi request nhạy cảm.
    4.  **Login API**:
        *   `POST /api/auth/login`: Xác thực thông tin đăng nhập, trả về JWT Token.

---
## 🛠️ Công cụ hỗ trợ (Helper Scripts)

*   `scripts/fresh_start.sh`: Tự động hóa toàn bộ quy trình Reset & Re-deploy (Network, App, DB, User Enrollment).
*   `scripts/create_sample_data.sh`: Tạo dữ liệu mẫu (Assets) cho các user Tomoko, Brad, JinSoo, Max.

---

## 📚 Tài liệu tham khảo

*   [Chi tiết về Network & Debugging](network/README.md)
*   [Lý thuyết CCAAS & Troubleshooting](network/docs/CCAAS_THEORY_AND_PRACTICE.md) 

