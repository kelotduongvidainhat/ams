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
    
    # Fetch user from blockchain to verify existence and get Role
    user_data=$(curl -s "$API_URL/users/$user_id?user_id=User1")
    
    # Check if user exists
    if echo "$user_data" | jq -e '.id' > /dev/null 2>&1; then
        
        # Extract Role from Chain (authoritative source)
        role=$(echo "$user_data" | jq -r '.role')
        
        # PII LOOKUP (Offline Map - since Chaincode has no PII)
        full_name="Unknown"
        identity_number="N/A"
        
        case "$user_id" in
            "Tomoko")
                full_name="Tomoko Jones"
                identity_number="T001-JP"
                ;;
            "Brad")
                full_name="Brad Smith"
                identity_number="B002-US"
                ;;
            "JinSoo")
                full_name="Jin Soo Kwon"
                identity_number="J003-KR"
                ;;
            "Max")
                full_name="Max Mustermann"
                identity_number="M004-DE"
                ;;
            "Adriana")
                full_name="Adriana Lima"
                identity_number="A005-BR"
                ;;
            "Michel")
                full_name="Michel Dupont"
                identity_number="M006-FR"
                ;;
            "admin")
                full_name="System Administrator"
                identity_number="ADMIN-001"
                ;;
            "auditor")
                full_name="System Auditor"
                identity_number="AUDIT-001"
                ;;
            "user01")
                full_name="Generic User 01"
                identity_number="U001-GEN"
                ;;
            *)
                full_name="$user_id"
                identity_number="UNKNOWN"
                ;;
        esac
        
        echo "  ✓ Found: $user_id ($role). Assigning PII: $full_name"
        
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
