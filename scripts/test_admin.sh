#!/bin/bash
API_URL="http://localhost:3000/api"

echo "=========================================="
echo "      TESTING ADMIN SERVICE               "
echo "=========================================="

echo "1. Logging in as Admin..."
LOGIN_RESP=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

# Check if login succeeded
if echo "$LOGIN_RESP" | jq -e '.error' > /dev/null; then
  echo "❌ Login failed!"
  echo "$LOGIN_RESP" | jq .
  exit 1
fi

TOKEN=$(echo $LOGIN_RESP | jq -r .token)

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed (No token)!"
  echo $LOGIN_RESP
  exit 1
fi
echo "✅ Logged in successfully. Token received."

echo ""
echo "2. Testing Dashboard Stats (/admin/dashboard)..."
DASH_RESP=$(curl -s "$API_URL/protected/admin/dashboard" -H "Authorization: Bearer $TOKEN")
echo "$DASH_RESP" | jq .

echo ""
echo "3. Testing User List (/admin/users)..."
USERS_RESP=$(curl -s "$API_URL/protected/admin/users" -H "Authorization: Bearer $TOKEN")
echo "$USERS_RESP" | jq -c '.[0:3]' # Show first 3 users to avoid spam
echo "... (Total $(echo "$USERS_RESP" | jq '. | length') users)"

echo ""
echo "4. Testing Health (/admin/health)..."
HEALTH_RESP=$(curl -s "$API_URL/protected/admin/health" -H "Authorization: Bearer $TOKEN")
echo "$HEALTH_RESP" | jq .

echo ""
echo "=========================================="
echo "      TEST COMPLETE                       "
echo "=========================================="
