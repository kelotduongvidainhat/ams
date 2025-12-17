# Hướng dẫn Chaincode-as-a-Service (CCAAS) và Tổng kết Quá trình Debug

Tài liệu này tổng hợp các kiến thức lý thuyết về CCAAS và ghi lại chi tiết quá trình khắc phục sự cố mạng lưới Hyperledger Fabric mà chúng ta đã thực hiện.

---

## 1. Lý thuyết: Chaincode-as-a-Service (CCAAS)

### 1.1. Mô hình truyền thống (Docker-in-Docker)
Trong mô hình mặc định của Fabric (trước v2.4):
1.  Người dùng cài đặt source code (Go/Node/Java) lên Peer.
2.  Peer (đang chạy trong Docker) sẽ gọi Docker Daemon để **Build** một image mới chứa chaincode đó.
3.  Peer sẽ **Run** container chaincode đó và kết nối tới nó.

**Nhược điểm:**
*   **Yêu cầu quyền cao:** Peer cần mount `docker.sock` và có quyền root để điều khiển Docker Daemon của host. Điều này rủi ro bảo mật.
*   **Phụ thuộc:** Peer phải biết cách build source code (cần cài compiler, dependencies...). Lỗi `failed to build` rất phổ biến do môi trường không đồng nhất.
*   **K8s không thân thiện:** Chạy Docker-in-Docker trên Kubernetes rất phức tạp và không được khuyến khích.

### 1.2. Mô hình CCAAS (Chaincode-as-a-Service)
Đây là mô hình chúng ta đang sử dụng.
1.  **Peer không build gì cả.** Peer chỉ cần thông tin kết nối (Connection Profile).
2.  **Dev/Ops tự build và chạy Chaincode:** Chaincode chạy như một service độc lập (như một web server bình thường).
3.  **Tự do:** Bạn có thể deploy chaincode bằng tay, bằng Kubernetes Pod, hay Docker Compose riêng biệt.

**Cơ chế hoạt động:**
*   Chaincode Container lắng nghe trên 1 port (ví dụ: `9999`).
*   Peer nhận được gói `connection.json` chứa địa chỉ `chaincode_container:9999`.
*   Peer kết nối tới địa chỉ đó để gửi transaction.

---

## 2. Hành trình Debug & Giải pháp

Chúng ta đã trải qua một quá trình debug cam go để đi đến thành công. Dưới đây là tóm tắt các vấn đề và cách giải quyết:

### 2.1. Lỗi ban đầu: `write: broken pipe`
*   **Hiện tượng:** Khi deploy chaincode (kiểu cũ) lên Peer, quá trình build thất bại với lỗi `broken pipe` liên quan đến Docker socket.
*   **Nguyên nhân:** Môi trường Docker-in-Docker của Peer gặp vấn đề giao tiếp với Host Docker Daemon, hoặc do giới hạn tài nguyên/quyền hạn khiến luồng build bị ngắt.
*   **Quyết định:** Thay vì cố sửa lỗi cấu hình Docker build (rất mong manh), chúng ta chuyển sang **CCAAS** - loại bỏ hoàn toàn bước build này khỏi Peer.

### 2.2. Triển khai CCAAS
Chúng ta đã thực hiện các thay đổi sau:

1.  **Cấu hình Peer (`docker-compose.yaml`):**
    *   Bật External Builder: `CHAINCODE_AS_A_SERVICE_BUILDER_CONFIG`.
    *   Điều này báo cho Peer biết: "Nếu gặp gói chaincode loại CCAAS, hãy dùng logic kết nối ngoài, đừng cố build docker".

2.  **Chaincode Dockerfile:**
    *   Viết `Dockerfile` riêng cho `asset-transfer-basic`.
    *   Sử dụng Multi-stage build (Go build -> Alpine) để tối ưu kích thước image (<20MB).

3.  **Script `deployCCAAS.sh`:**
    *   Đây là "trái tim" của quy trình. Script này làm thay Peer các việc sau:
        1.  Build Docker Image: `docker build`.
        2.  Chạy Container: `docker run`.
        3.  Đóng gói `connection.json` và `metadata.json` vào file `.tar.gz`.
        4.  Gửi gói tin này cho Peer: `peer lifecycle chaincode install`.

### 2.3. Các lỗi kỹ thuật đã xử lý (Troubleshooting Log)

**Lỗi 1: `chaincode definition exists, but chaincode is not installed`**
*   **Nguyên nhân:** Peer đã commit definition (version 2.0) nhưng không tìm thấy container chạy chaincode tương ứng.
*   **Lý do sâu xa:** `Package ID` dùng khi Approve bị sai (rỗng hoặc rác), dẫn đến Peer chờ đợi một ID ma.
*   **Khắc phục:** Sửa script để tính toán chính xác `Package ID` bằng lệnh `peer lifecycle chaincode calculatepackageid`.

**Lỗi 2: `no such file or directory` khi tính Package ID**
*   **Nguyên nhân:** Lệnh `peer` chạy trên host (để tính ID offline) nhưng thiếu biến `FABRIC_CFG_PATH` trỏ tới file `core.yaml`.
*   **Khắc phục:** Thêm `export FABRIC_CFG_PATH=${PWD}/../config` vào script.

**Lỗi 3: `unable to load orderer.tls.rootcert.file` trong `createChannel`**
*   **Nguyên nhân:** Script chạy lệnh `docker exec` nhưng truyền đường dẫn file TLS của **Host** (`/home/sleep/...`) vào trong **Container** (nơi đường dẫn đó không tồn tại).
*   **Khắc phục:** Định nghĩa biến `ORDERER_CA_CONTAINER` trỏ đúng đường dẫn `/opt/gopath/...` bên trong container CLI và truyền biến này vào lệnh.

**Lỗi 4: `Permissions denied` khi clean network**
*   **Nguyên nhân:** Docker container chạy với user root tạo ra file, user thường không xóa được.
*   **Khắc phục:** Dùng `sudo rm` khi dọn dẹp.

---

## 3. Cấu trúc thư mục hiện tại

*   `network/scripts/deployCCAAS.sh`: Script tự động hóa deploy chaincode.
*   `network/chaincode/asset-transfer/Dockerfile`: File build chaincode.
*   `network/chaincode/asset-transfer/ccaas/`: Nơi chứa `connection.json` (được tạo động bởi script).
*   `network/docker/docker-compose.yaml`: Chứa cấu hình mạng lưới và định nghĩa service `cli`.

## 4. Hướng dẫn sử dụng nhanh

**Khởi động lại từ đầu (Sạch sẽ):**
```bash
./network.sh down
./network.sh up
./network.sh createChannel -c mychannel
./network.sh deployCC -ccn basic -ccp ./chaincode/asset-transfer -ccv 1.0 -ccs 1
```

**Query dữ liệu:**
```bash
docker exec cli peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}'
```

**Nâng cấp Chaincode (Ví dụ lên v2.0):**
```bash
./network.sh deployCC -ccn basic -ccp ./chaincode/asset-transfer -ccv 2.0 -ccs 2
```
Script sẽ tự động stop container cũ, build container mới, và thực hiện quy trình upgrade lifecycle.
