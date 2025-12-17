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
├── scripts/
│   └── registerEnroll.sh         # Script đăng ký và enroll identities
├── organizations/                # Chứa crypto material (sẽ được tạo tự động)
├── channel-artifacts/            # Chứa channel artifacts
└── system-genesis-block/         # Chứa genesis block
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
chmod +x network.sh scripts/registerEnroll.sh
./network.sh up
```

Lệnh này sẽ:
- Khởi động 2 Certificate Authority servers (cho Org1 và Orderer Org)
- Tạo crypto material cho tất cả peers và orderers
- Khởi động 3 orderers và 3 peers

### 2. Tạo và join channel

```bash
./network.sh createChannel -c mychannel
```

**Lưu ý**: Nếu gặp lỗi khi join peer1 và peer2, chạy lệnh sau để join thủ công:

```bash
docker exec -e CORE_PEER_ADDRESS=peer1.org1.example.com:8051 cli peer channel join -b ./channel-artifacts/mychannel.block
docker exec -e CORE_PEER_ADDRESS=peer2.org1.example.com:9051 cli peer channel join -b ./channel-artifacts/mychannel.block
```

### 3. Kiểm tra trạng thái mạng lưới

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

### 5. Tắt mạng lưới

```bash
./network.sh down
```

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
