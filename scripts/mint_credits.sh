#!/bin/bash

# Mint Credits for All Users
# This script mints initial credits for all blockchain users

API_URL="http://localhost:3000/api"

echo "========================================================="
echo "   💰 Minting Initial Credits for All Users"
echo "========================================================="

# Login as admin
echo "🔐 Logging in as admin..."
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Failed to login as admin"
    exit 1
fi

echo "✅ Admin authenticated"
echo ""

# Users and their initial balances
declare -A USERS=(
    ["Tomoko"]=1000
    ["Brad"]=1500
    ["JinSoo"]=2000
    ["Max"]=2500
    ["Adriana"]=3000
    ["Michel"]=1000
    ["user01"]=1000
    ["demo_user"]=1000
)

echo "--- Minting Credits for Users ---"
echo ""

for USER in "${!USERS[@]}"; do
    AMOUNT=${USERS[$USER]}
    echo "💰 Minting $AMOUNT credits for $USER..."
    
    RESPONSE=$(curl -s -X POST "$API_URL/protected/marketplace/mint" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"target_user_id\":\"$USER\",\"amount\":$AMOUNT}")
    
    if echo "$RESPONSE" | grep -q "Successfully minted"; then
        echo "  ✓ Success: $USER now has $AMOUNT credits"
    else
        echo "  ✗ Failed: $(echo $RESPONSE | jq -r '.error // .message')"
    fi
    echo ""
done

echo "========================================================="
echo "✅ Credit Minting Complete"
echo "========================================================="
echo ""
echo "📊 Initial Balances:"
echo "-----------------------------------------------------------"
echo "User           | Balance (USD)"
echo "-----------------------------------------------------------"
for USER in "${!USERS[@]}"; do
    printf "%-14s | %s\n" "$USER" "${USERS[$USER]}"
done
echo "-----------------------------------------------------------"
