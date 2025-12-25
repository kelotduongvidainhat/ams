#!/bin/bash

# Script to sync users from blockchain to PostgreSQL
# This is needed for users created by InitLedger (which doesn't emit events)

API_URL="http://localhost:3000/api"

echo "========================================================="
echo "   🔄 Syncing Users from Blockchain to PostgreSQL"
echo "========================================================="

# List of users to sync
users=("Tomoko" "Brad" "JinSoo" "Max" "Adriana" "Michel" "admin" "auditor" "user01")

for user_id in "${users[@]}"; do
    echo "📥 Fetching user: $user_id from blockchain..."
    
    # Fetch user from blockchain
    user_data=$(curl -s "$API_URL/users/$user_id?user_id=User1")
    
    # Check if user exists
    if echo "$user_data" | jq -e '.id' > /dev/null 2>&1; then
        # Extract user details
        full_name=$(echo "$user_data" | jq -r '.full_name')
        identity_number=$(echo "$user_data" | jq -r '.identity_number')
        role=$(echo "$user_data" | jq -r '.role')
        
        echo "  ✓ Found: $full_name ($role)"
        
        # Insert into PostgreSQL
        docker exec -i ams-postgres psql -U ams_user -d ams_db <<EOF
INSERT INTO users (id, full_name, identity_number, role, updated_at)
VALUES ('$user_id', '$full_name', '$identity_number', '$role', NOW())
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    identity_number = EXCLUDED.identity_number,
    role = EXCLUDED.role,
    updated_at = NOW();
EOF
        echo "  ✓ Synced to PostgreSQL"
    else
        echo "  ✗ User not found on blockchain"
    fi
    echo ""
done

echo "========================================================="
echo "✅ User Sync Complete"
echo "========================================================="
echo ""
echo "Verifying PostgreSQL..."
docker exec -i ams-postgres psql -U ams_user -d ams_db -c \
  "SELECT id, full_name, role FROM users WHERE id IN ('Tomoko', 'Brad', 'JinSoo', 'Max', 'Adriana', 'Michel', 'admin', 'auditor', 'user01') ORDER BY id;"
echo ""
