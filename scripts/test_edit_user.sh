#!/bin/bash
API_URL="http://localhost:3000/api"

echo "🧪 Testing User Update Capability..."

# 1. Register a fresh user
echo "1️⃣ Registering User 'TestEdit01'..."
curl -s -X POST "$API_URL/wallet/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "TestEdit01",
    "password": "password123",
    "full_name": "Original Name",
    "identity_number": "ID-ORIG-001"
  }' | jq
echo ""
sleep 2

# 2. Check Initial State
echo "2️⃣ Checking Initial State..."
curl -s "$API_URL/users/TestEdit01?user_id=admin" | jq
echo ""

# 3. Update User Info
echo "3️⃣ Updating User (Name -> 'Updated Name')..."
curl -s -X PUT "$API_URL/users/TestEdit01" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Updated Name",
    "identity_number": "ID-UPDATED-999"
  }' | jq
echo ""
sleep 2

# 4. Verify Update (Chain)
echo "4️⃣ Verifying Chain State..."
curl -s "$API_URL/users/TestEdit01?user_id=admin" | jq
echo ""

# 5. Verify Update (Postgres)
echo "5️⃣ Verifying Database Sync..."
docker exec ams-postgres psql -U ams_user -d ams_db -c "SELECT id, full_name, identity_number FROM users WHERE id='TestEdit01';"
