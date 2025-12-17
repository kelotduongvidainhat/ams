#!/bin/bash

CHANNEL_NAME="$1"
DELAY="$2"
MAX_RETRY="$3"

: ${CHANNEL_NAME:="mychannel"}
: ${DELAY:="3"}
: ${MAX_RETRY:="5"}

# imports
. scripts/envVar.sh

if [ ! -d "channel-artifacts" ]; then
	mkdir channel-artifacts
fi

createChannelGenesisBlock() {
	which configtxgen
	if [ "$?" -ne 0 ]; then
		echo "configtxgen tool not found."
		exit 1
	fi
	echo "Generating channel genesis block '${CHANNEL_NAME}.block'"
	configtxgen -profile ChannelUsingRaft -outputBlock ./channel-artifacts/${CHANNEL_NAME}.block -channelID $CHANNEL_NAME
}

createChannel() {
	# Poll in case the raft leader is not set yet
	local rc=1
	local COUNTER=1
	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
		sleep $DELAY
		osnadmin channel join --channelID $CHANNEL_NAME --config-block ./channel-artifacts/${CHANNEL_NAME}.block -o localhost:7053 --ca-file "$ORDERER_CA" --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY" >&log.txt
		res=$?
		let rc=$res
		COUNTER=$(expr $COUNTER + 1)
	done
	cat log.txt
	verifyResult $res "Channel creation failed"
}

# joinChannel ORG
joinChannel() {
  PEER=$1
  ORG=$2
  
  # Determine peer address based on peer number
  if [ $PEER -eq 0 ]; then
    PEER_ADDRESS="peer0.org1.example.com:7051"
  elif [ $PEER -eq 1 ]; then
    PEER_ADDRESS="peer1.org1.example.com:8051"
  elif [ $PEER -eq 2 ]; then
    PEER_ADDRESS="peer2.org1.example.com:9051"
  fi
  
	local rc=1
	local COUNTER=1
	## Sometimes Join takes time, hence retry
	while [ $rc -ne 0 -a $COUNTER -lt $MAX_RETRY ] ; do
    sleep $DELAY
    docker exec -e CORE_PEER_ADDRESS=$PEER_ADDRESS cli peer channel join -b ./channel-artifacts/$CHANNEL_NAME.block >&log.txt
    res=$?
    let rc=$res
    COUNTER=$(expr $COUNTER + 1)
	done
	cat log.txt
	verifyResult $res "After $MAX_RETRY attempts, peer${PEER}.org${ORG} has failed to join channel '$CHANNEL_NAME' "
}

setAnchorPeer() {
  PEER=$1
  ORG=$2
  docker exec cli peer channel fetch config channel-artifacts/config_block.pb -o orderer1.example.com:7050 --ordererTLSHostnameOverride orderer1.example.com -c $CHANNEL_NAME --tls --cafile \$ORDERER_CA
  
  echo "Fetched config block"
  
  docker exec cli configtxlator proto_decode --input channel-artifacts/config_block.pb --type common.Block --output channel-artifacts/config_block.json
  docker exec cli jq .data.data[0].payload.data.config channel-artifacts/config_block.json > channel-artifacts/config.json
  
  docker exec cli jq '.channel_group.groups.Application.groups.Org1MSP.values += {"AnchorPeers":{"mod_policy": "Admins","value":{"anchor_peers": [{"host": "peer0.org1.example.com","port": 7051}]},"version": "0"}}' channel-artifacts/config.json > channel-artifacts/modified_config.json
  
  docker exec cli configtxlator proto_encode --input channel-artifacts/config.json --type common.Config --output channel-artifacts/config.pb
  docker exec cli configtxlator proto_encode --input channel-artifacts/modified_config.json --type common.Config --output channel-artifacts/modified_config.pb
  docker exec cli configtxlator compute_update --channel_id $CHANNEL_NAME --original channel-artifacts/config.pb --updated channel-artifacts/modified_config.pb --output channel-artifacts/config_update.pb
  
  docker exec cli configtxlator proto_decode --input channel-artifacts/config_update.pb --type common.ConfigUpdate --output channel-artifacts/config_update.json
  docker exec cli sh -c 'echo "{\"payload\":{\"header\":{\"channel_header\":{\"channel_id\":\"'$CHANNEL_NAME'\", \"type\":2}},\"data\":{\"config_update\":"$(cat channel-artifacts/config_update.json)"}}}" | jq . > channel-artifacts/config_update_in_envelope.json'
  docker exec cli configtxlator proto_encode --input channel-artifacts/config_update_in_envelope.json --type common.Envelope --output channel-artifacts/config_update_in_envelope.pb
  
  docker exec cli peer channel update -f channel-artifacts/config_update_in_envelope.pb -c $CHANNEL_NAME -o orderer1.example.com:7050 --ordererTLSHostnameOverride orderer1.example.com --tls --cafile \$ORDERER_CA
}

verifyResult() {
  if [ $1 -ne 0 ]; then
    echo "!!!!!!!!!!!!!!! "$2" !!!!!!!!!!!!!!!!"
    echo
    exit 1
  fi
}

FABRIC_CFG_PATH=${PWD}
ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
ORDERER_ADMIN_TLS_SIGN_CERT=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/tls/server.crt
ORDERER_ADMIN_TLS_PRIVATE_KEY=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer1.example.com/tls/server.key

## Create channel genesis block
echo "Creating channel genesis block"
createChannelGenesisBlock

## Join all the orderers to the channel
echo "Joining orderer1 to channel..."
osnadmin channel join --channelID $CHANNEL_NAME --config-block ./channel-artifacts/${CHANNEL_NAME}.block -o localhost:7053 --ca-file "$ORDERER_CA" --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY"

echo "Joining orderer2 to channel..."
osnadmin channel join --channelID $CHANNEL_NAME --config-block ./channel-artifacts/${CHANNEL_NAME}.block -o localhost:8053 --ca-file "$ORDERER_CA" --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY"

echo "Joining orderer3 to channel..."
osnadmin channel join --channelID $CHANNEL_NAME --config-block ./channel-artifacts/${CHANNEL_NAME}.block -o localhost:9053 --ca-file "$ORDERER_CA" --client-cert "$ORDERER_ADMIN_TLS_SIGN_CERT" --client-key "$ORDERER_ADMIN_TLS_PRIVATE_KEY"

sleep 2

## Join all the peers to the channel
echo "Joining peer0.org1 to the channel..."
joinChannel 0 1

echo "Joining peer1.org1 to the channel..."
joinChannel 1 1

echo "Joining peer2.org1 to the channel..."
joinChannel 2 1

## Set the anchor peers for each org in the channel
echo "Setting anchor peer for org1..."
setAnchorPeer 0 1

echo "Channel '$CHANNEL_NAME' created and joined successfully"
