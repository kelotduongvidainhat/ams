#!/bin/bash

# Script to sync users from blockchain to PostgreSQL
# This is needed for users created by InitLedger (which doesn't emit events)

API_URL="http://localhost:3000/api"

echo "========================================================="
echo "   🔄 Syncing Users from Blockchain to PostgreSQL"
echo "========================================================="

# List of users to sync
users=("Tomoko" "Brad" "JinSoo" "Max" "Adriana" "Michel" "admin" "auditor" "user01")

# Helper to get default PII (since it's not on chain)
get_full_name() {
    case $1 in
        "Tomoko") echo "Tomoko" ;;
        "Brad") echo "Brad" ;;
        "JinSoo") echo "Jin Soo" ;;
        "Max") echo "Max" ;;
        "Adriana") echo "Adriana" ;;
        "Michel") echo "Michel" ;;
        "admin") echo "System Admin" ;;
        "auditor") echo "Auditor One" ;;
        "user01") echo "User One" ;;
        *) echo "Imported User ($1)" ;;
    esac
}

for user_id in "${users[@]}"; do
    echo "📥 Fetching user: $user_id from blockchain..."
    
    # Fetch user from blockchain
    user_data=$(curl -s "$API_URL/users/$user_id?user_id=User1")
    
    # Check if user exists
    if echo "$user_data" | jq -e '.id' > /dev/null 2>&1; then
        # Extract user details (Operational Data Only)
        role=$(echo "$user_data" | jq -r '.role')
        balance=$(echo "$user_data" | jq -r '.balance // 0')
        status=$(echo "$user_data" | jq -r '.status // "Active"')
        
        # Get Fallback Name (Only used if INSERTING new row)
        full_name=$(get_full_name "$user_id")

        echo "  ✓ Found: $user_id ($role) - Balance: $balance"
        
        # Upsert: 
        # - If ID exists (Seed Data): UPDATE ONLY Operational Fields (Role, Balance, Status). Keep PII intact.
        # - If ID missing: INSERT with fallback Name.
        docker exec -i ams-postgres psql -U ams_user -d ams_db <<EOF
INSERT INTO users (id, full_name, role, status, balance, updated_at)
VALUES ('$user_id', '$full_name', '$role', '$status', $balance, NOW())
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    balance = EXCLUDED.balance,
    updated_at = NOW();
EOF
        echo "  ✓ Synced to PostgreSQL (Hybrid Core Safe)"
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
  "SELECT id, full_name, role, balance FROM users WHERE id IN ('Tomoko', 'Brad', 'JinSoo', 'Max', 'Adriana', 'Michel', 'admin', 'auditor', 'user01') ORDER BY id;"
echo ""
