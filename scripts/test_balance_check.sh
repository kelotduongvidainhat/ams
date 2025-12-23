#!/bin/bash
API_URL="http://localhost:3000/api"

echo "🔹 1. Logging in as Tomoko..."
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"Tomoko","password":"tomoko123"}' | jq -r '.token')

if [ "$TOKEN" == "null" ]; then
    echo "❌ Login failed"
    exit 1
fi

echo "🔹 2. Checking Balance..."
RESPONSE=$(curl -s -X GET "$API_URL/protected/user/balance" \
    -H "Authorization: Bearer $TOKEN")

BALANCE=$(echo $RESPONSE | jq -r '.balance')

echo "----------------------------------------"
echo "API Response: $RESPONSE"
echo "Parsed Balance: $BALANCE"
echo "Expected Balance: 1000"
echo "----------------------------------------"

if [ "$BALANCE" == "1000" ]; then
    echo "✅ SUCCESS: Balance is correct."
else
    echo "❌ FAILURE: Balance is incorrect (likely 0 due to JSON casing issue)."
fi
