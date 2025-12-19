#!/bin/bash

# Base URL
API_URL="http://localhost:3000/api"

echo "========================================================="
echo "        📦 AMS System: Creating Sample Data"
echo "========================================================="

# Helper function for creating users
create_user() {
    local id=$1
    local name=$2
    local identity=$3
    local role=$4

    echo "👤 Creating User: $name ($id)..."
    curl -s -X POST "$API_URL/users" \
        -H "Content-Type: application/json" \
        -d "{
            \"id\": \"$id\",
            \"full_name\": \"$name\",
            \"identity_number\": \"$identity\",
            \"role\": \"$role\"
        }" | jq .
    echo ""
}

# Helper function for curling assets
create_asset() {
    local id=$1
    local name=$2
    local type=$3
    local owner=$4
    # value removed
    local status=$5
    local meta=$6

    echo "🔹 Creating Asset: $name ($id) for $owner..."
    curl -s -X POST "$API_URL/assets?user_id=$owner" \
        -H "Content-Type: application/json" \
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


echo "--- 1. Creating Users ---"
echo "Skipping default user creation (Handled by Chaincode InitLedger)"

echo "--- 2. Creating Assets ---"


# 1. Real Estate Assets (Tomoko)
create_asset "asset101" "Luxury Penthouse" "Real Estate" "Tomoko" "Available" "https://example.com/meta/penthouse.json"
create_asset "asset102" "Seaside Villa" "Real Estate" "Tomoko" "Available" "https://example.com/meta/villa.json"

# 2. Vehicle Assets (Brad)
create_asset "asset201" "Tesla Model S Plaid" "Vehicle" "Brad" "Available" "https://example.com/meta/tesla.json"
create_asset "asset202" "Porsche 911 GT3" "Vehicle" "Brad" "Available" "https://example.com/meta/porsche.json"

# 3. Art Assets (JinSoo)
create_asset "asset301" "Mona Lisa Replica" "Art" "JinSoo" "Private" "https://example.com/meta/art1.json"
create_asset "asset302" "Ancient Vase" "Art" "JinSoo" "Available" "https://example.com/meta/vase.json"

# 4. Tech Assets (Max)
create_asset "asset401" "Quantum Computer Prototype" "Technology" "Max" "Locked" "https://example.com/meta/quantum.json"

echo "========================================================="
echo "✅ Sample Data Created Successfully"
echo "========================================================="
