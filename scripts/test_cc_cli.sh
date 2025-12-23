#!/bin/bash

# Configuration
CHANNEL_NAME="mychannel"
CC_NAME="basic"
ORDERER_CA="/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
ORDERER_ADDRESS="orderer1.example.com:7050"

echo "========================================================="
echo "       ⛓️  Testing Chaincode via CLI Container"
echo "========================================================="

# Helper function to execute command inside CLI container
exec_cli() {
    docker exec cli "$@"
}

echo ""
echo "🔹 1. Querying existing asset (asset1)..."
exec_cli peer chaincode query -C $CHANNEL_NAME -n $CC_NAME -c '{"function":"ReadAsset","Args":["asset1"]}'

echo ""
echo ""
echo "🔹 2. Invoking: CreateAsset(assetTest001)..."
# We need to provide all arguments: id, name, type, owner, status, metadataUrl, metadataHash
exec_cli peer chaincode invoke \
    -o $ORDERER_ADDRESS \
    --ordererTLSHostnameOverride orderer1.example.com \
    --tls --cafile $ORDERER_CA \
    -C $CHANNEL_NAME -n $CC_NAME \
    --peerAddresses peer0.org1.example.com:7051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    -c '{"function":"CreateAsset","Args":["assetTest001","CLI Test Asset","TestType","Admin","Active","http://cli-test.com","cli-hash"]}'

echo ""
echo "🔹 3. Querying created asset (assetTest001)..."
sleep 2 # Wait for block commitment
exec_cli peer chaincode query -C $CHANNEL_NAME -n $CC_NAME -c '{"function":"ReadAsset","Args":["assetTest001"]}'

echo ""
echo ""
echo "🔹 4. Invoking: UpdateAsset(assetTest001) -> Change Status to 'Sold'..."
exec_cli peer chaincode invoke \
    -o $ORDERER_ADDRESS \
    --ordererTLSHostnameOverride orderer1.example.com \
    --tls --cafile $ORDERER_CA \
    -C $CHANNEL_NAME -n $CC_NAME \
    --peerAddresses peer0.org1.example.com:7051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    -c '{"function":"UpdateAsset","Args":["assetTest001","CLI Test Asset","TestType","NewOwner123","Sold","http://cli-test.com/updated","cli-hash"]}'

echo ""
echo "🔹 5. Querying updated asset (assetTest001)..."
sleep 2
exec_cli peer chaincode query -C $CHANNEL_NAME -n $CC_NAME -c '{"function":"ReadAsset","Args":["assetTest001"]}'

echo ""
echo "========================================================="
echo "✅ Test Complete"
