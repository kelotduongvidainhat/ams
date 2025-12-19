#!/bin/bash

# Script to test the basic chaincode functionality using the CLI container
# Usage: ./test_network.sh

echo "--- 1. Query All Assets (Initial State) ---"
docker exec cli peer chaincode query -C mychannel -n basic -c '{"Args":["GetAllAssets"]}'
echo ""

echo "--- 2. Create a New Asset (iPhone 16) - AssetID: asset99 ---"
docker exec cli peer chaincode invoke -o orderer1.example.com:7050 --ordererTLSHostnameOverride orderer1.example.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n basic -c '{"Args":["CreateAsset","asset99","iPhone 16","Electronics","Alice","Pre-order","http://apple.com/iphone16","dummy_hash_for_test"]}'
sleep 3
echo ""

echo "--- 3. Transfer Asset (asset3 from Jin Soo to Leonardo) ---"
docker exec cli peer chaincode invoke -o orderer1.example.com:7050 --ordererTLSHostnameOverride orderer1.example.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n basic -c '{"Args":["TransferAsset","asset3","Leonardo"]}'
sleep 3
echo ""

echo "--- 4. Verify Transfer (Read asset3) ---"
docker exec cli peer chaincode query -C mychannel -n basic -c '{"Args":["ReadAsset","asset3"]}'
echo ""

echo "--- 5. Verify Creation (Read asset99) ---"
docker exec cli peer chaincode query -C mychannel -n basic -c '{"Args":["ReadAsset","asset99"]}'
echo ""

echo "Test Complete."
