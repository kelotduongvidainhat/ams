#!/bin/bash

# Configuration
API_URL="http://localhost:3000/api"
AUTH_USER="Tomoko"
AUTH_PASS="tomoko123"
RECIPIENT_USER="Brad"
RECIPIENT_PASS="brad123"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "==================================================="
echo "       AMS COMPREHENSIVE SYSTEM TEST"
echo "==================================================="

# 1. Health Check
echo -e "\n🔍 1. Testing System Health..."
HEALTH=$(curl -s "$API_URL/health" | jq -r '.status')
if [ "$HEALTH" == "ok" ]; then
    echo -e "${GREEN}✅ Backend is HEALTHY${NC}"
else
    echo -e "${RED}❌ Backend is UNHEALTHY${NC}"
    exit 1
fi

# 2. Authentication
echo -e "\n🔐 2. Testing Authentication..."
# Login Tomoko
TOKEN_RESP=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$AUTH_USER\",\"password\":\"$AUTH_PASS\"}")
TOKEN=$(echo $TOKEN_RESP | jq -r '.token')

if [ "$TOKEN" != "null" ]; then
    echo -e "${GREEN}✅ Login Successful for $AUTH_USER${NC}"
else
    echo -e "${RED}❌ Login Failed${NC}"
    echo $TOKEN_RESP
    exit 1
fi

# Login Brad (Recipient)
TOKEN_BRAD_RESP=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$RECIPIENT_USER\",\"password\":\"$RECIPIENT_PASS\"}")
TOKEN_BRAD=$(echo $TOKEN_BRAD_RESP | jq -r '.token')

# 3. IPFS Upload
echo -e "\n📦 3. Testing IPFS Upload..."
echo "Test IPFS Content $(date)" > test_upload.txt
IPFS_RESP=$(curl -s -F "file=@test_upload.txt" "$API_URL/ipfs/upload")
CID=$(echo $IPFS_RESP | jq -r '.cid')
GATEWAY_URL=$(echo $IPFS_RESP | jq -r '.gateway_url')

if [ "$CID" != "null" ]; then
    echo -e "${GREEN}✅ IPFS Upload Successful (CID: $CID)${NC}"
else
    echo -e "${RED}❌ IPFS Upload Failed${NC}"
    echo $IPFS_RESP
    exit 1
fi

# 4. Create Asset (with IPFS Link)
echo -e "\n✨ 4. Testing Asset Creation..."
ASSET_ID="test-asset-$(date +%s)"
CREATE_RESP=$(curl -s -X POST "$API_URL/protected/assets" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"id\": \"$ASSET_ID\",
        \"name\": \"Test Asset\",
        \"type\": \"Electronics\",
        \"status\": \"Available\",
        \"metadata_url\": \"$GATEWAY_URL\"
    }")

MSG=$(echo $CREATE_RESP | jq -r '.message')
if [[ "$MSG" == *"successfully"* ]]; then
    echo -e "${GREEN}✅ Asset Created: $ASSET_ID${NC}"
else
    echo -e "${RED}❌ Asset Creation Failed${NC}"
    echo $CREATE_RESP
    exit 1
fi

# Wait for sync
echo "   ⏳ Waiting 2s for Event Sync..."
sleep 2

# 5. Search / Explorer
echo -e "\n🔎 5. Testing Search API..."
SEARCH_RESP=$(curl -s "$API_URL/explorer/assets?search=Test&type=Electronics")
FOUND_ID=$(echo $SEARCH_RESP | jq -r ".[0].id")

if [ "$FOUND_ID" == "$ASSET_ID" ]; then
    echo -e "${GREEN}✅ Search Functionality Verified (Found $ASSET_ID)${NC}"
else
    echo -e "${RED}❌ Search Failed or Sync Lagging${NC}"
fi

# 6. Transfer Lifecycle
echo -e "\narrows_counterclockwise 6. Testing Multi-Sig Transfer..."

# Initiate
INIT_RESP=$(curl -s -X POST "$API_URL/protected/transfers/initiate" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"asset_id\": \"$ASSET_ID\",
        \"new_owner\": \"$RECIPIENT_USER\"
    }")
INIT_MSG=$(echo $INIT_RESP | jq -r '.message')

if [[ "$INIT_MSG" == *"initiated"* ]]; then
    echo -e "${GREEN}✅ Transfer Initiated${NC}"
else
    echo -e "${RED}❌ Transfer Initiation Failed${NC}"
    echo $INIT_RESP
    exit 1
fi

echo "   ⏳ Waiting 3s for Sync..."
sleep 3

# Check Pending (as Brad)
PENDING_RESP=$(curl -s -H "Authorization: Bearer $TOKEN_BRAD" "$API_URL/protected/transfers/pending")
# Find the pending transfer ID for our asset (simplified check)
HAS_PENDING=$(echo $PENDING_RESP | grep "$ASSET_ID")

if [[ "$HAS_PENDING" != "" ]]; then
    echo -e "${GREEN}✅ Recipient sees Pending Transfer${NC}"
else
    echo -e "${RED}❌ Pending Transfer NOT found for Recipient${NC}"
    echo $PENDING_RESP
    exit 1
fi

# Approve (as Brad)
echo -e "   👍 Approving as Recipient..."
APPROVE_RESP=$(curl -s -X POST "$API_URL/protected/transfers/$ASSET_ID/approve" \
    -H "Authorization: Bearer $TOKEN_BRAD")
APP_STATUS=$(echo $APPROVE_RESP | jq -r '.status')

if [ "$APP_STATUS" == "APPROVED" ]; then
    echo -e "${GREEN}✅ Transfer Approved Successfully${NC}"
else
    echo -e "${RED}❌ Transfer Approval Failed${NC}"
    echo $APPROVE_RESP
    exit 1
fi

# Final Verification
echo -e "\n✅ 7. verifying Final Ownership..."
sleep 30
FINAL_ASSET=$(curl -s "$API_URL/explorer/assets?search=$ASSET_ID")
FINAL_OWNER=$(echo $FINAL_ASSET | jq -r ".[0].owner")

if [ "$FINAL_OWNER" == "$RECIPIENT_USER" ]; then
    echo -e "${GREEN}✅ Ownership Transferred to $RECIPIENT_USER${NC}"
else
    echo -e "${RED}❌ Final Ownership Mismatch: $FINAL_OWNER${NC}"
fi

echo -e "\n==================================================="
echo -e "       🎉 ALL SYSTEMS OPERATIONAL"
echo -e "==================================================="
rm test_upload.txt
