#!/bin/bash

export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}
export VERBOSE=false

# Print the usage message
function printHelp() {
  echo "Usage: "
  echo "  network.sh <Mode> [Flags]"
  echo "    Modes:"
  echo "      up - Bring up Fabric orderer and peer nodes"
  echo "      down - Clear the network"
  echo "      restart - Restart the network"
  echo "      createChannel - Create and join a channel"
  echo "      deployCC - Deploy a chaincode"
  echo
  echo "    Flags:"
  echo "    -c <channel name> - Channel name to use (defaults to \"mychannel\")"
  echo "    -ccn <name> - Chaincode name"
  echo "    -ccp <path> - Chaincode path"
  echo "    -ccl <language> - Chaincode language (defaults to \"go\")"
  echo "    -ccv <version> - Chaincode version (defaults to \"1.0\")"
  echo
  echo "  network.sh -h (print this message)"
}

function clearContainers() {
  echo "Removing containers..."
  docker rm -f $(docker ps -aq --filter network=fabric_network) 2>/dev/null || true
}

function removeUnwantedImages() {
  echo "Removing chaincode images..."
  docker rmi -f $(docker images -q --filter=reference='dev-peer*') 2>/dev/null || true
}

function networkDown() {
  cd docker
  docker-compose -f docker-compose.yaml -f docker-compose-ca.yaml down --volumes --remove-orphans
  cd ..
  
  clearContainers
  removeUnwantedImages
  
  # Remove generated artifacts
  rm -rf organizations/peerOrganizations
  rm -rf organizations/ordererOrganizations
  rm -rf organizations/fabric-ca/org1 organizations/fabric-ca/org1/tls-cert.pem organizations/fabric-ca/org1/ca-cert.pem organizations/fabric-ca/org1/IssuerPublicKey organizations/fabric-ca/org1/IssuerRevocationPublicKey organizations/fabric-ca/org1/fabric-ca-server.db
  rm -rf organizations/fabric-ca/ordererOrg organizations/fabric-ca/ordererOrg/tls-cert.pem organizations/fabric-ca/ordererOrg/ca-cert.pem organizations/fabric-ca/ordererOrg/IssuerPublicKey organizations/fabric-ca/ordererOrg/IssuerRevocationPublicKey organizations/fabric-ca/ordererOrg/fabric-ca-server.db
  rm -rf channel-artifacts/*.block channel-artifacts/*.tx
  rm -rf system-genesis-block/*.block
  
  echo "Network cleared!"
}

function networkUp() {
  # Check if network already exists
  if [ "$(docker ps -q -f name=peer0.org1.example.com)" ]; then
    echo "Network is already running!"
    exit 1
  fi

  # Create CA directories
  mkdir -p organizations/fabric-ca/org1
  mkdir -p organizations/fabric-ca/ordererOrg

  # Start CA servers
  echo "Starting Certificate Authorities..."
  cd docker
  docker-compose -f docker-compose-ca.yaml up -d
  cd ..
  
  echo "Waiting for CAs to start..."
  sleep 3

  # Create crypto material using CA
  echo "Creating Org1 Identities"
  . scripts/registerEnroll.sh
  createOrg1

  echo "Creating Orderer Org Identities"
  createOrderer

  # Create MSP directories
  mkdir -p organizations/ordererOrganizations/example.com/msp/tlscacerts
  cp organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/tls/tlscacerts/* organizations/ordererOrganizations/example.com/msp/tlscacerts/tlsca.example.com-cert.pem

  mkdir -p organizations/ordererOrganizations/example.com/msp/cacerts
  cp organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/msp/cacerts/* organizations/ordererOrganizations/example.com/msp/cacerts/ca.example.com-cert.pem

  mkdir -p organizations/peerOrganizations/org1.example.com/msp/tlscacerts
  cp organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/tlscacerts/* organizations/peerOrganizations/org1.example.com/msp/tlscacerts/ca.crt

  mkdir -p organizations/peerOrganizations/org1.example.com/msp/cacerts
  cp organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp/cacerts/* organizations/peerOrganizations/org1.example.com/msp/cacerts/ca.org1.example.com-cert.pem

  mkdir -p organizations/peerOrganizations/org1.example.com/tlsca
  cp organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/tlscacerts/* organizations/peerOrganizations/org1.example.com/tlsca/tlsca.org1.example.com-cert.pem

  mkdir -p organizations/peerOrganizations/org1.example.com/ca
  cp organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/msp/cacerts/* organizations/peerOrganizations/org1.example.com/ca/ca.org1.example.com-cert.pem

  # Start the network
  echo "Starting peer and orderer nodes..."
  cd docker
  docker-compose -f docker-compose.yaml up -d
  cd ..

  echo "Waiting for nodes to start..."
  sleep 5

  echo "Network started successfully!"
  docker ps -a
}

function createChannel() {
  CHANNEL_NAME=${1:-mychannel}
  
  echo "Creating channel: $CHANNEL_NAME"
  
  # Make scripts executable
  chmod +x scripts/createChannel.sh scripts/envVar.sh
  
  # Run the channel creation script
  ./scripts/createChannel.sh $CHANNEL_NAME
  
  echo "Channel creation completed!"
}

# Parse mode
MODE=$1
shift

# Parse flags
while [[ $# -ge 1 ]] ; do
  key="$1"
  case $key in
  -h )
    printHelp
    exit 0
    ;;
  -c )
    CHANNEL_NAME="$2"
    shift
    ;;
  -ccn )
    CC_NAME="$2"
    shift
    ;;
  -ccp )
    CC_SRC_PATH="$2"
    shift
    ;;
  -ccl )
    CC_LANGUAGE="$2"
    shift
    ;;
  -ccv )
    CC_VERSION="$2"
    shift
    ;;
  -ccs )
    CC_SEQUENCE="$2"
    shift
    ;;
  * )
    echo "Unknown flag: $key"
    printHelp
    exit 1
    ;;
  esac
  shift
done

# Determine mode
if [ "$MODE" == "up" ]; then
  networkUp
elif [ "$MODE" == "down" ]; then
  networkDown
elif [ "$MODE" == "restart" ]; then
  networkDown
  networkUp
elif [ "$MODE" == "createChannel" ]; then
  createChannel ${CHANNEL_NAME:-mychannel}
elif [ "$MODE" == "deployCC" ]; then
  scripts/deployCCAAS.sh "${CHANNEL_NAME:-mychannel}" "${CC_NAME:-basic}" "${CC_SRC_PATH:-./chaincode/asset-transfer}" "${CC_VERSION:-1.0}" "${CC_SEQUENCE:-1}"
else
  printHelp
  exit 1
fi
