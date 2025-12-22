#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "========================================================="
echo "        🚀 AMS System: Fresh Start Protocol"
echo "========================================================="

# 1. Teardown Application
echo "📉 [Step 1/7] Tearing down Application Services..."
docker-compose -f docker-compose-app.yaml down --remove-orphans || true

# 2. Cleanup Docker System
echo "🧹 [Step 2/7] Cleaning up Docker System (Volumes/Networks)..."
# Force prune to remove conflict volumes
docker system prune -f --volumes

# 3. Teardown Fabric Network
echo "📉 [Step 3/7] Tearing down Fabric Network..."
cd network
./network.sh down
cd ..

# 4. Deep Clean (Permissions)
# Sometimes Docker creates files as root, requiring sudo to remove
if [ -d "network/organizations/fabric-ca/org1/msp" ] || [ -d "network/organizations/fabric-ca/ordererOrg/msp" ]; then
    echo "🧹 [Step 4/7] Cleaning persistent MSP artifacts (requires sudo)..."
    sudo rm -rf network/organizations/fabric-ca/org1/msp network/organizations/fabric-ca/ordererOrg/msp
fi

# 5. Start Network & Deploy Chaincode
echo "🚀 [Step 5/7] Bootstrapping Network & Chaincode..."
cd network
./network.sh up
./network.sh createChannel -c mychannel
./network.sh deployCC -ccn basic -ccp ./chaincode/asset-transfer -ccv 1.0 -ccs 1
cd ..

# 6. Enroll Default Users
echo "🔐 [Step 6/7] Enrolling Default Users..."
chmod +x scripts/enrollUser.sh
./scripts/enrollUser.sh Tomoko password
./scripts/enrollUser.sh Brad password
./scripts/enrollUser.sh JinSoo password
./scripts/enrollUser.sh Max password
./scripts/enrollUser.sh Adriana password
./scripts/enrollUser.sh Adriana password
./scripts/enrollUser.sh Michel password
./scripts/enrollUser.sh admin adminpw
./scripts/enrollUser.sh auditor auditor123

# 7. Launch Application
echo "🚀 [Step 7/7] Launching Application (Frontend + Backend + DB)..."
docker-compose -f docker-compose-app.yaml up -d --build

# 8. Initialize Database
echo "⏳ Waiting for Database to be ready..."
sleep 10
echo "💾 Initializing Database Schema..."
docker exec -i ams-postgres psql -U ams_user -d ams_db < database/schema.sql || echo "⚠️  Database might already be initialized or failed."


# 9. Populate Extended Sample Data
echo "📦 [Step 9/10] Populating Extended Sample Data..."
./scripts/create_sample_data.sh

# 10. Create Test Authenticated User
echo "🔐 [Step 10/12] Creating Test User with Password..."
sleep 3 # Wait for backend to be fully ready
curl -s -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"id": "demo_user", "full_name": "Demo User", "identity_number": "DEMO001", "role": "User", "password": "demo123"}' \
  > /dev/null && echo "✅ Test user 'demo_user' created (password: demo123)" || echo "⚠️  User creation skipped (might already exist)"

# 11. Sync Blockchain Users to PostgreSQL
echo "🔄 [Step 11/12] Syncing blockchain users to PostgreSQL..."
./scripts/sync_users.sh

# 12. Add Passwords to All Existing Users
echo "🔐 [Step 12/12] Adding passwords to all blockchain users..."
./scripts/add_passwords.sh

echo "========================================================="
echo "✅  SYSTEM READY"

echo "========================================================="
echo "👉 Frontend: http://localhost:5173"
echo "👉 Backend:  http://localhost:3000/api/health"
echo "👉 Explorer: http://localhost:3000/api/explorer/assets"
echo ""
echo "🔐 Login Credentials:"
echo "   Username: demo_user | Password: demo123"
echo "   Username: Tomoko    | Password: tomoko123"
echo "   Username: admin     | Password: admin123"
echo "   (See scripts/add_passwords.sh for full list)"
echo ""
echo "Test Commands:"
echo "curl \"http://localhost:3000/api/assets?user_id=Tomoko\""
echo "curl -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{\"username\":\"Tomoko\",\"password\":\"tomoko123\"}'"
