#!/bin/bash

# Script to add passwords to all existing Fabric CA enrolled users
# Uses the new /api/auth/set-password endpoint

API_URL="http://localhost:3000/api"

echo "========================================================="
echo "   🔐 Adding Passwords to Existing Users"
echo "========================================================="

# Function to set password for existing user
set_password() {
    local user_id=$1
    local password=$2

    echo "🔑 Setting password for: $user_id..."
    curl -s -X POST "$API_URL/auth/set-password" \
        -H "Content-Type: application/json" \
        -d "{
            \"user_id\": \"$user_id\",
            \"password\": \"$password\"
        }" | jq .
    echo ""
}

echo "--- Setting Passwords for All Users ---"
echo ""

# Set passwords for all default users
set_password "Tomoko" "tomoko123"
set_password "Brad" "brad123"
set_password "JinSoo" "jinsoo123"
set_password "Max" "max123"
set_password "Adriana" "adriana123"
set_password "Michel" "michel123"
set_password "admin" "admin123"
set_password "auditor" "auditor123"
set_password "user01" "user01123"

echo "========================================================="
echo "✅ Passwords Set Successfully"
echo "========================================================="
echo ""
echo "📋 Login Credentials Summary:"
echo "-----------------------------------------------------------"
echo "Username       | Password      | Role      | Wallet"
echo "-----------------------------------------------------------"
echo "demo_user      | demo123       | User      | ✓"
echo "Tomoko         | tomoko123     | User      | ✓"
echo "Brad           | brad123       | User      | ✓"
echo "JinSoo         | jinsoo123     | User      | ✓"
echo "Max            | max123        | User      | ✓"
echo "Adriana        | adriana123    | User      | ✓"
echo "Michel         | michel123     | User      | ✓"
echo "admin          | admin123      | Admin     | ✓"
echo "auditor        | auditor123    | Auditor   | ✓"
echo "user01         | user01123     | User      | ✓"
echo "-----------------------------------------------------------"
echo ""
echo "🌐 Frontend Login: http://localhost:5173"
echo "🔐 All users now have both blockchain wallets AND passwords!"
echo ""
