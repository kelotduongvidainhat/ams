#!/bin/bash

# Set globals for peer
setGlobals() {
  local PEER=$1
  local ORG=$2
  
  if [ $ORG -eq 1 ]; then
    export CORE_PEER_LOCALMSPID="Org1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer${PEER}.org1.example.com/tls/ca.crt
    export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
    
    if [ $PEER -eq 0 ]; then
      export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
    elif [ $PEER -eq 1 ]; then
      export CORE_PEER_ADDRESS=peer1.org1.example.com:8051
    elif [ $PEER -eq 2 ]; then
      export CORE_PEER_ADDRESS=peer2.org1.example.com:9051
    fi
  fi

  export ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
}

verifyResult() {
  if [ $1 -ne 0 ]; then
    echo "!!!!!!!!!!!!!!! "$2" !!!!!!!!!!!!!!!!"
    echo
    exit 1
  fi
}
