#!/bin/bash

echo "========================================="
echo "  HYPERLEDGER FABRIC NETWORK STATUS"
echo "========================================="
echo ""

echo "📦 DOCKER CONTAINERS:"
echo "-------------------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "NAME|peer|orderer|ca|cli"
echo ""

echo "🔗 CHANNEL INFORMATION:"
echo "-------------------------------------"
echo "Channel: mychannel"
docker exec cli peer channel getinfo -c mychannel 2>/dev/null | grep "Blockchain info"
echo ""

echo "👥 PEERS STATUS:"
echo "-------------------------------------"
echo "Peer0 (port 7051):"
docker exec -e CORE_PEER_ADDRESS=peer0.org1.example.com:7051 cli peer channel list 2>/dev/null | grep "mychannel"

echo "Peer1 (port 8051):"
docker exec -e CORE_PEER_ADDRESS=peer1.org1.example.com:8051 cli peer channel list 2>/dev/null | grep "mychannel"

echo "Peer2 (port 9051):"
docker exec -e CORE_PEER_ADDRESS=peer2.org1.example.com:9051 cli peer channel list 2>/dev/null | grep "mychannel"
echo ""

echo "⚙️  ORDERERS STATUS:"
echo "-------------------------------------"
echo "Orderer1 (port 7050/7053):"
curl -s --cacert organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --cert organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/tls/server.crt --key organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/tls/server.key https://localhost:7053/participation/v1/channels 2>/dev/null | grep -o '"name":"[^"]*"' | head -1

echo "Orderer2 (port 8050/8053):"
curl -s --cacert organizations/ordererOrganizations/example.com/orderers/orderer2.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --cert organizations/ordererOrganizations/example.com/orderers/orderer2.example.com/tls/server.crt --key organizations/ordererOrganizations/example.com/orderers/orderer2.example.com/tls/server.key https://localhost:8053/participation/v1/channels 2>/dev/null | grep -o '"name":"[^"]*"' | head -1

echo "Orderer3 (port 9050/9053):"
curl -s --cacert organizations/ordererOrganizations/example.com/orderers/orderer3.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --cert organizations/ordererOrganizations/example.com/orderers/orderer3.example.com/tls/server.crt --key organizations/ordererOrganizations/example.com/orderers/orderer3.example.com/tls/server.key https://localhost:9053/participation/v1/channels 2>/dev/null | grep -o '"name":"[^"]*"' | head -1
echo ""

echo "========================================="
echo "  NETWORK SUMMARY"
echo "========================================="
echo "✅ Organization: Org1MSP"
echo "✅ Peers: 3 (peer0, peer1, peer2)"
echo "✅ Orderers: 3 (orderer1, orderer2, orderer3)"
echo "✅ Consensus: Raft"
echo "✅ Channel: mychannel"
echo "========================================="
