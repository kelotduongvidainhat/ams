#!/bin/bash
API_URL="http://localhost:3000/api"

echo "🧪 Testing Multi-Signature Asset Transfer (Full Cycle)..."

# Helper
get_token() { echo $1 | jq -r '.token'; }

# 1. Login
echo "1️⃣ Logging in..."
TOKEN_TOMOKO=$(get_token "$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username": "Tomoko", "password": "tomoko123"}')")
TOKEN_BRAD=$(get_token "$(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d '{"username": "Brad", "password": "brad123"}')")

ASSET_ID="asset101"

# CHECK CURRENT OWNER
echo "🔍 Checking owner of $ASSET_ID..."
ASSET_INFO=$(curl -s -H "Authorization: Bearer $TOKEN_TOMOKO" "$API_URL/assets?user_id=Tomoko" | jq -r ".[] | select(.ID == \"$ASSET_ID\")")
CURRENT_OWNER=$(echo $ASSET_INFO | jq -r '.owner')
echo "   Current Owner: $CURRENT_OWNER"

# DEFINE FLOW BASED ON OWNER
if [ "$CURRENT_OWNER" == "Tomoko" ]; then
    SENDER="Tomoko"
    RECIPIENT="Brad"
    SENDER_TOKEN=$TOKEN_TOMOKO
    RECIPIENT_TOKEN=$TOKEN_BRAD
else
    SENDER="Brad"
    RECIPIENT="Tomoko"
    SENDER_TOKEN=$TOKEN_BRAD
    RECIPIENT_TOKEN=$TOKEN_TOMOKO
fi

echo "🔄 Initiating Transfer: $SENDER -> $RECIPIENT"

# Initiate
INIT_RES=$(curl -s -X POST "$API_URL/protected/transfers/initiate" \
  -H "Authorization: Bearer $SENDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "asset_id": "'"$ASSET_ID"'", "new_owner": "'"$RECIPIENT"'" }')
echo "   Initiate: $(echo $INIT_RES | jq -r '.message // .error')"

# Verify Pending
echo "🔍 Checking Pending Transfers..."
PENDING_RES=$(curl -s -X GET "$API_URL/protected/transfers/pending" -H "Authorization: Bearer $RECIPIENT_TOKEN")
echo "   Pending Count: $(echo $PENDING_RES | jq '. | length')"

# Approve
echo "✍️  Recipient ($RECIPIENT) Checking & Approving..."
APPROVE_RES=$(curl -s -X POST "$API_URL/protected/transfers/$ASSET_ID/approve" \
  -H "Authorization: Bearer $RECIPIENT_TOKEN")
echo "   Approve: $(echo $APPROVE_RES | jq -r '.message // .error')"

# Wait for Sync
echo "⏳ Waiting 5s for Sync..."
sleep 5

# Verify Chain
echo "✅ Verifying Ownership on Chain..."
NEW_ASSET_INFO=$(curl -s -H "Authorization: Bearer $RECIPIENT_TOKEN" "$API_URL/assets?user_id=$RECIPIENT" | jq -r ".[] | select(.ID == \"$ASSET_ID\")")
NEW_OWNER_CHAIN=$(echo $NEW_ASSET_INFO | jq -r '.owner')
echo "   Chain Owner: $NEW_OWNER_CHAIN"

if [ "$NEW_OWNER_CHAIN" != "$RECIPIENT" ]; then
    echo "❌ CHAIN UPDATE FAILED or NOT REFLECTED"
else 
    echo "✅ CHAIN UDPATE SUCCESS"
fi

# Verify DB
echo "✅ Verifying PostgreSQL (assets table)..."
docker exec ams-postgres psql -U ams_user -d ams_db -c "SELECT id, owner FROM assets WHERE id='$ASSET_ID';"

# HISTORY
echo "📜 Verifying History (asset_history table)..."
docker exec ams-postgres psql -U ams_user -d ams_db -c "SELECT asset_id, action_type, to_owner, timestamp FROM asset_history WHERE asset_id='$ASSET_ID' ORDER BY timestamp DESC LIMIT 5;"

echo "🏁 Cycle Complete. (Run again to transfer back)"
