#!/bin/bash

export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config
source scripts/envVar.sh

CHANNEL_NAME=${1:-"mychannel"}
CC_NAME=${2:-"basic"}
CC_SRC_PATH=${3:-"./chaincode/asset-transfer"}
CC_VERSION=${4:-"1.0"}
CC_SEQUENCE=${5:-"1"}
docker_network_name="fabric_network"

# Setup CCAAS package
preparePackage() {
  echo "Preparing CCAAS package..."
  rm -rf chaincode/asset-transfer/ccaas
  mkdir -p chaincode/asset-transfer/ccaas
  
  # connection.json
  # Address points to the chaincode container name. 
  # We will name the container ${CC_NAME}_${CC_VERSION}
  cat > chaincode/asset-transfer/ccaas/connection.json <<EOF
{
  "address": "${CC_NAME}_${CC_VERSION}:9999",
  "dial_timeout": "10s",
  "tls_required": false
}
EOF

  # metadata.json
  cat > chaincode/asset-transfer/ccaas/metadata.json <<EOF
{
    "type": "ccaas",
    "label": "${CC_NAME}_${CC_VERSION}"
}
EOF

  # Tar the package
  pushd chaincode/asset-transfer/ccaas
  tar -czf code.tar.gz connection.json
  tar -czf ${CC_NAME}.tar.gz metadata.json code.tar.gz
  mv ${CC_NAME}.tar.gz ../../../channel-artifacts/
  popd
  echo "CCAAS package created at channel-artifacts/${CC_NAME}.tar.gz"
}

# Build and run chaincode container
buildAndRunChaincode() {
  echo "Building Chaincode Docker Image..."
  docker build -t ${CC_NAME}_image -f ${CC_SRC_PATH}/Dockerfile ${CC_SRC_PATH}
  
  echo "Stopping any existing chaincode container..."
  docker rm -f ${CC_NAME}_${CC_VERSION} || true
  
  # Calculate Package ID
  # We need to install first to get the ID, OR we can calculate it if we have 'peer' binary with 'calculatepackageid'.
  # But simplest is to install, grep the ID, then start the container.
}

startChaincodeContainer() {
  PACKAGE_ID=$1
  echo "Starting Chaincode Container with Package ID: $PACKAGE_ID"
  
  docker run -d --name ${CC_NAME}_${CC_VERSION} --network $docker_network_name \
    -e CHAINCODE_SERVER_ADDRESS=0.0.0.0:9999 \
    -e CORE_CHAINCODE_ID_NAME=$PACKAGE_ID \
    -e CHAINCODE_ID=$PACKAGE_ID \
    ${CC_NAME}_image
}

# installChaincode PEER ORG
installChaincode() {
  PEER=$1
  ORG=$2
  setGlobals $PEER $ORG
  
  echo "Installing chaincode on peer${PEER}.org${ORG}..."
  
  set -x
  docker exec -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
              -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
              -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
              -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
              cli peer lifecycle chaincode install channel-artifacts/${CC_NAME}.tar.gz >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Chaincode installation on peer${PEER}.org${ORG} has failed"
  
  # Extract Package ID
  PACKAGE_ID=$(peer lifecycle chaincode calculatepackageid channel-artifacts/${CC_NAME}.tar.gz | tr -d '\n' | tr -d '\r')
  echo "Chaincode is installed on peer${PEER}.org${ORG}"
  echo "Calculated Package ID: '${PACKAGE_ID}'"
}

# approveForMyOrg PEER ORG
approveForMyOrg() {
  PEER=$1
  ORG=$2
  setGlobals $PEER $ORG
  
  echo "Approving chaincode definition for Org${ORG}..."
  
  set -x
  docker exec -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
              -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
              -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
              -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
              cli peer lifecycle chaincode approveformyorg -o orderer1.example.com:7050 --ordererTLSHostnameOverride orderer1.example.com --tls --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --package-id $PACKAGE_ID --sequence $CC_SEQUENCE --init-required >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Chaincode definition approved on peer${PEER}.org${ORG} has failed"
  echo "Chaincode definition approved on peer${PEER}.org${ORG}"
}

# commitChaincodeDefinition PEER ORG
commitChaincodeDefinition() {
  PEER=$1
  ORG=$2
  setGlobals $PEER $ORG
  
  echo "Committing chaincode definition..."
  
  set -x
  docker exec -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
              -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
              -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
              -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
              cli peer lifecycle chaincode commit -o orderer1.example.com:7050 --ordererTLSHostnameOverride orderer1.example.com --tls --cafile $ORDERER_CA --channelID $CHANNEL_NAME --name $CC_NAME --version $CC_VERSION --sequence $CC_SEQUENCE --init-required >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Chaincode definition commit failed"
  echo "Chaincode definition committed"
}

# initChaincode PEER ORG
initChaincode() {
  PEER=$1
  ORG=$2
  setGlobals $PEER $ORG
  
  echo "Initializing chaincode..."
  
  set -x
  docker exec -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
              -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
              -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
              -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
              cli peer chaincode invoke -o orderer1.example.com:7050 --ordererTLSHostnameOverride orderer1.example.com --tls --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_NAME --isInit -c '{"function":"InitLedger","Args":[]}' >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Invoke transaction failed on peer${PEER}.org${ORG}"
  echo "Chaincode initialized"
}

## Execution Flow
preparePackage
buildAndRunChaincode

## Install chaincode on peer0.org1 (returns PACKAGE_ID)
installChaincode 0 1

## Start the CCAAS container now that we have the Package ID
startChaincodeContainer $PACKAGE_ID

## Approve for Org1
approveForMyOrg 0 1

## Commit definition
commitChaincodeDefinition 0 1

## Init chaincode (Wait a bit for container to start)
sleep 5
initChaincode 0 1

echo "========================================================="
echo "CCAAS Chaincode Deployment Successful!"
echo "Chaincode Container: ${CC_NAME}_${CC_VERSION}"
echo "Package ID: $PACKAGE_ID"
echo "========================================================="

exit 0
