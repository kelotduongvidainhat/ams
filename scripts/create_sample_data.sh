#!/bin/bash

# Base URL
API_URL="http://localhost:3000/api"

echo "========================================================="
echo "        📦 AMS System: Creating Sample Data (Authenticated)"
echo "========================================================="

# Helper function to get token
get_token() {
    local username=$1
    local password=$2
    
    # Lowercase username for password convention (mostly)
    # But add_passwords.sh uses specific mapping.
    # Tomoko -> tomoko123
    
    TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\"}" | jq -r '.token')
        
    echo $TOKEN
}

# Helper function for creating assets (Protected)
create_asset() {
    local token=$1
    local id=$2
    local name=$3
    local type=$4
    local owner=$5
    local status=$6
    local meta=$7

    echo "🔹 Creating Asset: $name ($id) for $owner..."
    curl -s -X POST "$API_URL/protected/assets" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d "{
            \"id\": \"$id\",
            \"name\": \"$name\",
            \"type\": \"$type\",
            \"owner\": \"$owner\",
            \"status\": \"$status\",
            \"metadata_url\": \"$meta\"
        }" | jq .
    echo ""
}

# Helper function to list asset for sale
list_asset() {
    local token=$1
    local id=$2
    local price=$3
    local currency=$4

    echo "🏷️  Listing Asset: $id for $price $currency..."
    curl -s -X POST "$API_URL/protected/marketplace/list" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d "{
            \"asset_id\": \"$id\",
            \"price\": $price,
            \"currency\": \"$currency\"
        }" | jq .
    echo ""
}

# --- Login Users ---
echo "🔑 Logging in users..."
TOKEN_TOMOKO=$(get_token "Tomoko" "tomoko123")
TOKEN_BRAD=$(get_token "Brad" "brad123")
TOKEN_JINSOO=$(get_token "JinSoo" "jinsoo123")
TOKEN_MAX=$(get_token "Max" "max123")

if [ "$TOKEN_TOMOKO" == "null" ]; then echo "❌ Failed to login Tomoko"; exit 1; fi
echo "✅ Logged in successfully"
echo ""


echo "--- Creating & Listing Assets ---"

# 1. Real Estate Assets (Tomoko)
# Create
create_asset "$TOKEN_TOMOKO" "asset101" "Luxury Penthouse" "RealEstate" "Tomoko" "Active" "https://example.com/meta/penthouse.json"
create_asset "$TOKEN_TOMOKO" "asset102" "Seaside Villa" "RealEstate" "Tomoko" "Active" "https://example.com/meta/villa.json"

# List one for sale
list_asset "$TOKEN_TOMOKO" "asset101" 2500000 "USD"


# 2. Vehicle Assets (Brad)
create_asset "$TOKEN_BRAD" "asset201" "Tesla Model S Plaid" "Vehicle" "Brad" "Active" "https://example.com/meta/tesla.json"
create_asset "$TOKEN_BRAD" "asset202" "Porsche 911 GT3" "Vehicle" "Brad" "Active" "https://example.com/meta/porsche.json"

# List one for sale
list_asset "$TOKEN_BRAD" "asset202" 185000 "USD"


# 3. Art Assets (JinSoo)
create_asset "$TOKEN_JINSOO" "asset301" "Mona Lisa Replica" "Art" "JinSoo" "Private" "https://example.com/meta/art1.json"
create_asset "$TOKEN_JINSOO" "asset302" "Ancient Vase" "Art" "JinSoo" "Active" "https://example.com/meta/vase.json"

# List one for sale
list_asset "$TOKEN_JINSOO" "asset302" 1200 "USD"


# 4. Tech Assets (Max)
create_asset "$TOKEN_MAX" "asset401" "Quantum Computer Prototype" "Technology" "Max" "Locked" "https://example.com/meta/quantum.json"


echo "========================================================="
echo "✅ Sample Data Created & Listed Successfully"
echo "========================================================="
