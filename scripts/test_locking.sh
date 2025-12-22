#!/bin/bash
API_URL="http://localhost:3000/api"

echo "=========================================="
echo "      TESTING USER LOCKING                "
echo "=========================================="

echo "1. Logging in as Admin..."
LOGIN_RESP=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}')

TOKEN=$(echo $LOGIN_RESP | jq -r .token)

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Admin Login failed!"
  echo $LOGIN_RESP
  exit 1
fi
echo "✅ Admin Logged in successfully."

TARGET_USER="Tomoko"

echo ""
echo "2. Current Status of $TARGET_USER"
curl -s "$API_URL/protected/admin/users" -H "Authorization: Bearer $TOKEN" | jq -r ".[] | select(.id==\"$TARGET_USER\") | .status"

echo ""
echo "3. Locking User $TARGET_USER..."
LOCK_RESP=$(curl -s -X POST "$API_URL/protected/admin/users/$TARGET_USER/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "Locked"}')
echo "$LOCK_RESP" | jq .

echo ""
echo "4. Verifying Status of $TARGET_USER (Should be Locked)..."
curl -s "$API_URL/protected/admin/users" -H "Authorization: Bearer $TOKEN" | jq -r ".[] | select(.id==\"$TARGET_USER\") | .status"

echo ""
echo "5. Attempting Login as Locked User ($TARGET_USER)..."
TOMOKO_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "Tomoko", "password": "tomoko123"}')

echo "$TOMOKO_LOGIN"
if echo "$TOMOKO_LOGIN" | grep -q "Locked"; then
    echo "✅ Login Denied (Account Locked)"
else
    echo "❌ Test Failed: Login should have been denied."
fi

echo ""
echo "6. Unlocking User $TARGET_USER..."
UNLOCK_RESP=$(curl -s -X POST "$API_URL/protected/admin/users/$TARGET_USER/status" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "Active"}')
echo "$UNLOCK_RESP" | jq .

echo ""
echo "7. Attempting Login as Unlocked User ($TARGET_USER)..."
TOMOKO_LOGIN_2=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "Tomoko", "password": "tomoko123"}')

if echo "$TOMOKO_LOGIN_2" | jq -e '.token' > /dev/null; then
    echo "✅ Login Successful (Account Unlocked)"
else
    echo "❌ Test Failed: Login failed."
    echo "$TOMOKO_LOGIN_2"
fi

echo "=========================================="
echo "      TEST COMPLETE                       "
echo "=========================================="
