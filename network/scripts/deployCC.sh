#!/bin/bash


export PATH=${PWD}/../bin:$PATH
source scripts/envVar.sh


CHANNEL_NAME=${1:-"mychannel"}
CC_NAME=${2:-"basic"}
CC_SRC_PATH=${3:-"./chaincode/asset-transfer"}
CC_SRC_LANGUAGE=${4:-"golang"}
CC_VERSION=${5:-"1.0"}
CC_SEQUENCE=${6:-"1"}
CC_INIT_FCN=${7:-"InitLedger"}
CC_END_POLICY=${8:-"NA"}
CC_COLL_CONFIG=${9:-"NA"}
DELAY=${10:-"3"}
MAX_RETRY=${11:-"5"}
VERBOSE=${12:-"false"}

println() {
  echo "$1"
}

export FABRIC_CFG_PATH=$PWD/../config/

# User has to set FABRIC_CFG_PATH to the config folder if they are running this locally
if [ -d "../config" ]; then
    export FABRIC_CFG_PATH=$PWD/../config/
else 
    # If not found, fall back to current dir or docker default
     export FABRIC_CFG_PATH=$PWD
fi

# Function to check if a command exists
checkPrereqs() {
  peer version > /dev/null 2>&1
  if [[ $? -ne 0 ]]; then
    echo "Peer binary not found. Please ensure it is in your PATH."
    exit 1
  fi
}

packageChaincode() {
  rm -rf channel-artifacts/${CC_NAME}.tar.gz
  set -x
  
  echo "Vendoring dependencies..."
  pushd ${CC_SRC_PATH}
  go mod tidy
  go mod vendor
  popd
  
  echo "Packaging chaincode..."
  peer lifecycle chaincode package channel-artifacts/${CC_NAME}.tar.gz --path ${CC_SRC_PATH} --lang ${CC_SRC_LANGUAGE} --label ${CC_NAME}_${CC_VERSION} >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Chaincode packaging has failed"
  echo "Chaincode is packaged"
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
  echo "Chaincode is installed on peer${PEER}.org${ORG}"
}

# queryInstalled PEER ORG
queryInstalled() {
  PEER=$1
  ORG=$2
  setGlobals $PEER $ORG
  
  set -x
  docker exec -e CORE_PEER_LOCALMSPID=$CORE_PEER_LOCALMSPID \
              -e CORE_PEER_TLS_ROOTCERT_FILE=$CORE_PEER_TLS_ROOTCERT_FILE \
              -e CORE_PEER_MSPCONFIGPATH=$CORE_PEER_MSPCONFIGPATH \
              -e CORE_PEER_ADDRESS=$CORE_PEER_ADDRESS \
              cli peer lifecycle chaincode queryinstalled >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  PACKAGE_ID=$(sed -n "/${CC_NAME}_${CC_VERSION}/{s/^Package ID: //; s/, Label:.*$//; p;}" log.txt)
  verifyResult $res "Query installed on peer${PEER}.org${ORG} has failed"
  echo "Package ID is ${PACKAGE_ID}"
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
  # We should look up the orderer CA from envVar.sh or similar
  
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
              cli peer lifecycle chaincode invoke -o orderer1.example.com:7050 --ordererTLSHostnameOverride orderer1.example.com --tls --cafile $ORDERER_CA -C $CHANNEL_NAME -n $CC_NAME --isInit -c '{"function":"'${CC_INIT_FCN}'","Args":[]}' >&log.txt
  res=$?
  { set +x; } 2>/dev/null
  cat log.txt
  verifyResult $res "Invoke transaction failed on peer${PEER}.org${ORG}"
  echo "Chaincode initialized"
}

## Package the chaincode
packageChaincode

## Install chaincode on peer0.org1
installChaincode 0 1

## Query installed
queryInstalled 0 1

## Approve for Org1
approveForMyOrg 0 1

## Commit definition
commitChaincodeDefinition 0 1

## Init chaincode
initChaincode 0 1

exit 0
