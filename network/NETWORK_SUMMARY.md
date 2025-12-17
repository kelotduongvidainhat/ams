# ✅ Mạng lưới Hyperledger Fabric đã được thiết lập thành công!

## 📊 Cấu hình mạng lưới

### Tổng quan
- **1 Organization**: Org1MSP
- **3 Orderers**: orderer1, orderer2, orderer3 (Raft consensus)
- **3 Peers**: peer0, peer1, peer2 (thuộc Org1)
- **1 Channel**: mychannel
- **2 Certificate Authorities**: ca-org1, ca-orderer

### Chi tiết các thành phần

#### Orderers (Raft Consensus)
| Orderer | Ports | Admin Port | Metrics |
|---------|-------|------------|---------|
| orderer1.example.com | 7050 | 7053 | 9443 |
| orderer2.example.com | 8050 | 8053 | 9444 |
| orderer3.example.com | 9050 | 9053 | 9445 |

#### Peers (Org1)
| Peer | Port | Metrics | Status |
|------|------|---------|--------|
| peer0.org1.example.com | 7051 | 9446 | ✅ Joined mychannel |
| peer1.org1.example.com | 8051 | 9447 | ✅ Joined mychannel |
| peer2.org1.example.com | 9051 | 9448 | ✅ Joined mychannel |

#### Certificate Authorities
| CA | Port | Organization |
|----|------|--------------|
| ca-org1 | 7054 | Org1 |
| ca-orderer | 9054 | Orderer Org |

## 🚀 Các lệnh hữu ích

### Quản lý mạng lưới
```bash
# Khởi động mạng lưới
./network.sh up

# Tạo channel
./network.sh createChannel -c mychannel

# Kiểm tra trạng thái
./check-status.sh

# Tắt mạng lưới
./network.sh down

# Khởi động lại mạng lưới
./network.sh restart
```

### Làm việc với Peers
```bash
# Kiểm tra channels mà peer đã join
docker exec cli peer channel list

# Kiểm tra thông tin channel
docker exec cli peer channel getinfo -c mychannel

# Join peer vào channel (nếu cần)
docker exec -e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 cli peer channel join -b ./channel-artifacts/mychannel.block

# Kiểm tra chaincode đã cài đặt
docker exec cli peer lifecycle chaincode queryinstalled

# Xem logs của peer
docker logs peer0.org1.example.com -f
```

### Làm việc với Orderers
```bash
# Kiểm tra channels của orderer
curl -s --cacert organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --cert organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/tls/server.crt \
  --key organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/tls/server.key \
  https://localhost:7053/participation/v1/channels | jq

# Xem logs của orderer
docker logs orderer1.example.com -f
```

### Làm việc với CLI Container
```bash
# Truy cập vào CLI container
docker exec -it cli bash

# Trong CLI container, bạn có thể chạy các lệnh peer trực tiếp:
peer channel list
peer channel getinfo -c mychannel
```

## 📁 Cấu trúc thư mục

```
network/
├── configtx.yaml                 # Cấu hình channel và genesis block
├── network.sh                    # Script quản lý mạng lưới
├── check-status.sh               # Script kiểm tra trạng thái
├── docker/
│   ├── docker-compose.yaml       # Docker compose cho peers và orderers
│   └── docker-compose-ca.yaml    # Docker compose cho Certificate Authorities
├── scripts/
│   ├── registerEnroll.sh         # Script đăng ký và enroll identities
│   ├── createChannel.sh          # Script tạo channel
│   └── envVar.sh                 # Environment variables helper
├── organizations/                # Crypto material (được tạo tự động)
│   ├── peerOrganizations/
│   │   └── org1.example.com/
│   ├── ordererOrganizations/
│   │   └── example.com/
│   └── fabric-ca/
├── channel-artifacts/            # Channel artifacts (được tạo tự động)
└── system-genesis-block/         # Genesis block (được tạo tự động)
```

## 🔧 Troubleshooting

### Peer không join được channel
```bash
# Kiểm tra peer có đang chạy không
docker ps | grep peer

# Kiểm tra logs
docker logs peer0.org1.example.com

# Join lại channel
docker exec -e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 cli peer channel join -b ./channel-artifacts/mychannel.block
```

### Orderer không hoạt động
```bash
# Kiểm tra logs
docker logs orderer1.example.com

# Restart orderer
docker restart orderer1.example.com
```

### Dọn dẹp hoàn toàn
```bash
./network.sh down
docker system prune -a --volumes
```

## 📚 Tài liệu tham khảo

- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)
- [Fabric CA Documentation](https://hyperledger-fabric-ca.readthedocs.io/)
- [Raft Consensus](https://raft.github.io/)

## 🎯 Bước tiếp theo

1. **Deploy Chaincode**: Triển khai smart contract lên mạng lưới
2. **Thêm Organizations**: Mở rộng mạng lưới với nhiều organizations
3. **Monitoring**: Thiết lập Prometheus và Grafana để giám sát
4. **API Gateway**: Tạo REST API để tương tác với mạng lưới
5. **Application**: Phát triển ứng dụng client để tương tác với blockchain

---

**Lưu ý**: Mạng lưới này được cấu hình cho môi trường development/testing. Để sử dụng trong production, cần cấu hình thêm về security, backup, và high availability.
