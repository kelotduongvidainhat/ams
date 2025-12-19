#!/bin/bash

# Base URL
API_URL="http://localhost:3000/api"

echo "========================================================="
echo "        📦 AMS System: Creating Sample Data"
echo "========================================================="

# Helper function for curling
create_asset() {
    local id=$1
    local name=$2
    local type=$3
    local owner=$4
    local value=$5
    local status=$6
    local meta=$7

    echo "🔹 Creating Asset: $name ($id) for $owner..."
    curl -s -X POST "$API_URL/assets?user_id=$owner" \
        -H "Content-Type: application/json" \
        -d "{
            \"id\": \"$id\",
            \"name\": \"$name\",
            \"type\": \"$type\",
            \"owner\": \"$owner\",
            \"value\": $value,
            \"status\": \"$status\",
            \"metadata_url\": \"$meta\"
        }" | jq .
    echo ""
}

# 1. Real Estate Assets (Tomoko)
create_asset "asset101" "Luxury Penthouse" "Real Estate" "Tomoko" 1500000 "Available" "https://example.com/meta/penthouse.json"
create_asset "asset102" "Seaside Villa" "Real Estate" "Tomoko" 2200000 "Available" "https://example.com/meta/villa.json"

# 2. Vehicle Assets (Brad)
create_asset "asset201" "Tesla Model S Plaid" "Vehicle" "Brad" 120000 "Available" "https://example.com/meta/tesla.json"
create_asset "asset202" "Porsche 911 GT3" "Vehicle" "Brad" 180000 "Available" "https://example.com/meta/porsche.json"

# 3. Art Assets (JinSoo)
create_asset "asset301" "Mona Lisa Replica" "Art" "JinSoo" 5000 "Private" "https://example.com/meta/art1.json"
create_asset "asset302" "Ancient Vase" "Art" "JinSoo" 45000 "Available" "https://example.com/meta/vase.json"

# 4. Tech Assets (Max)
create_asset "asset401" "Quantum Computer Prototype" "Technology" "Max" 10000000 "Locked" "https://example.com/meta/quantum.json"

echo "========================================================="
echo "✅ Sample Data Created Successfully"
echo "========================================================="
