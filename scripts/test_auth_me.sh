#!/bin/bash
API_URL="http://localhost:3000/api"

echo "🔹 1. Logging in as Tomoko..."
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"Tomoko","password":"tomoko123"}' | jq -r '.token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Login failed"
    exit 1
fi

echo "✅ Login successful. Token obtained."

echo "🔹 2. Testing /auth/me endpoint..."
RESPONSE=$(curl -s -X GET "$API_URL/protected/auth/me" \
    -H "Authorization: Bearer $TOKEN")

ID=$(echo $RESPONSE | jq -r '.id')

echo "API Response: $RESPONSE"

if [ "$ID" == "Tomoko" ]; then
    echo "✅ SUCCESS: Session restored correctly. ID matches."
else
    echo "❌ FAILURE: ID mismatch or session invalid."
fi
