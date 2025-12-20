#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "========================================================="
echo "        🧹 AMS System: Deep Clean Protocol"
echo "========================================================="

# 1. Teardown Application
echo "📉 [Step 1/4] Tearing down Application Services..."
if [ -f "docker-compose-app.yaml" ]; then
    docker-compose -f docker-compose-app.yaml down --remove-orphans || true
else
    echo "⚠️ docker-compose-app.yaml not found, skipping app teardown."
fi

# 2. Cleanup Docker System
echo "🧹 [Step 2/4] Cleaning up Docker System (Volumes/Networks)..."
# Force prune to remove conflict volumes (Postgres data, Wallet volume)
docker system prune -f --volumes || true

# 3. Teardown Fabric Network
echo "📉 [Step 3/4] Tearing down Fabric Network..."
if [ -d "network" ]; then
    cd network
    ./network.sh down || true
    cd ..
else
    echo "⚠️ 'network' directory not found, skipping Fabric teardown."
fi

# 4. Deep Clean (Permissions)
# Sometimes Docker creates files as root, requiring sudo to remove
echo "🧹 [Step 4/4] Cleaning persistent MSP artifacts and Generated Crypto..."
if [ -d "network/organizations" ]; then
    sudo rm -rf network/organizations/fabric-ca/org1/msp 
    sudo rm -rf network/organizations/fabric-ca/ordererOrg/msp
    sudo rm -rf network/organizations/peerOrganizations
    sudo rm -rf network/organizations/ordererOrganizations
    # Also clean chaincode packages if any
    sudo rm -rf network/channel-artifacts
fi

echo "========================================================="
echo "✅ CLEANUP COMPLETE"
echo "========================================================="
