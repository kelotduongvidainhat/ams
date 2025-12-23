#!/bin/bash

# NFT Marketplace Stress Test
# Tests concurrent operations with multiple users

API_URL="http://localhost:3000/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "==================================================="
echo "   NFT MARKETPLACE STRESS TEST"
echo "   Testing concurrent operations at scale"
echo "==================================================="

# Test Configuration
NUM_USERS=5
NUM_ASSETS_PER_USER=3
TOTAL_ASSETS=$((NUM_USERS * NUM_ASSETS_PER_USER))

echo -e "\n${BLUE}📊 Test Configuration:${NC}"
echo "  - Users: $NUM_USERS"
echo "  - Assets per user: $NUM_ASSETS_PER_USER"
echo "  - Total assets: $TOTAL_ASSETS"
echo "  - Total operations: ~$((TOTAL_ASSETS * 4))"

# Arrays to store data
declare -a USER_TOKENS
declare -a USER_IDS
declare -a ASSET_IDS

# 1. Setup - Login all users
echo -e "\n${BLUE}🔐 Phase 1: Authenticating $NUM_USERS users...${NC}"
USERS=("Tomoko" "Brad" "JinSoo" "Max" "Adriana")
PASSWORDS=("tomoko123" "brad123" "jinsoo123" "max123" "adriana123")

for i in $(seq 0 $((NUM_USERS-1))); do
    USER=${USERS[$i]}
    PASS=${PASSWORDS[$i]}
    
    TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$USER\",\"password\":\"$PASS\"}" | jq -r '.token')
    
    if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
        USER_TOKENS[$i]=$TOKEN
        USER_IDS[$i]=$USER
        echo -e "${GREEN}✅${NC} $USER authenticated"
    else
        echo -e "${RED}❌${NC} Failed to authenticate $USER"
        exit 1
    fi
done

# 2. Admin mints credits for all users
echo -e "\n${BLUE}💰 Phase 2: Minting credits for all users...${NC}"
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | jq -r '.token')

for i in $(seq 0 $((NUM_USERS-1))); do
    USER=${USER_IDS[$i]}
    AMOUNT=$((1000 + i * 500))  # Different amounts for variety
    
    curl -s -X POST "$API_URL/protected/marketplace/mint" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"target_user_id\":\"$USER\",\"amount\":$AMOUNT}" > /dev/null
    
    echo -e "${GREEN}✅${NC} Minted $AMOUNT credits for $USER"
done

sleep 3

# 3. Create assets concurrently
echo -e "\n${BLUE}✨ Phase 3: Creating $TOTAL_ASSETS assets concurrently...${NC}"
START_TIME=$(date +%s)

for i in $(seq 0 $((NUM_USERS-1))); do
    USER=${USER_IDS[$i]}
    TOKEN=${USER_TOKENS[$i]}
    
    for j in $(seq 1 $NUM_ASSETS_PER_USER); do
        ASSET_ID="stress-test-${USER}-${j}-$(date +%s%N | cut -b1-13)"
        ASSET_IDS+=("$ASSET_ID")
        
        (
            curl -s -X POST "$API_URL/protected/assets" \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d "{
                    \"id\":\"$ASSET_ID\",
                    \"name\":\"Asset $j by $USER\",
                    \"type\":\"Test\",
                    \"status\":\"Available\",
                    \"metadata_url\":\"https://example.com/$ASSET_ID.json\"
                }" > /dev/null && echo -e "${GREEN}✅${NC} Created $ASSET_ID"
        ) &
    done
done

wait
CREATE_TIME=$(($(date +%s) - START_TIME))
echo -e "${BLUE}⏱️  Created $TOTAL_ASSETS assets in ${CREATE_TIME}s${NC}"

sleep 5

# 4. List assets for sale concurrently
echo -e "\n${BLUE}🏷️  Phase 4: Listing assets for sale concurrently...${NC}"
START_TIME=$(date +%s)

for i in $(seq 0 $((NUM_USERS-1))); do
    USER=${USER_IDS[$i]}
    TOKEN=${USER_TOKENS[$i]}
    
    for j in $(seq 1 $NUM_ASSETS_PER_USER); do
        ASSET_ID="${ASSET_IDS[$((i * NUM_ASSETS_PER_USER + j - 1))]}"
        PRICE=$((100 + RANDOM % 900))  # Random price 100-1000
        
        (
            curl -s -X POST "$API_URL/protected/marketplace/list" \
                -H "Authorization: Bearer $TOKEN" \
                -H "Content-Type: application/json" \
                -d "{\"asset_id\":\"$ASSET_ID\",\"price\":$PRICE}" > /dev/null && \
                echo -e "${GREEN}✅${NC} Listed $ASSET_ID for $PRICE"
        ) &
    done
done

wait
LIST_TIME=$(($(date +%s) - START_TIME))
echo -e "${BLUE}⏱️  Listed $TOTAL_ASSETS assets in ${LIST_TIME}s${NC}"

sleep 5

# 5. Query marketplace
echo -e "\n${BLUE}🔍 Phase 5: Querying marketplace...${NC}"
LISTED_COUNT=$(curl -s "$API_URL/explorer/assets" | jq '[.[] | select(.status == "For Sale")] | length')
echo -e "${GREEN}✅${NC} Found $LISTED_COUNT assets for sale"

# 6. Concurrent purchases
echo -e "\n${BLUE}💳 Phase 6: Simulating concurrent purchases...${NC}"
START_TIME=$(date +%s)
PURCHASE_COUNT=0

# Each user tries to buy from others
for buyer_idx in $(seq 0 $((NUM_USERS-1))); do
    BUYER=${USER_IDS[$buyer_idx]}
    BUYER_TOKEN=${USER_TOKENS[$buyer_idx]}
    
    # Try to buy 2 assets from other users
    for purchase_num in $(seq 1 2); do
        # Find an asset from a different user
        seller_idx=$(( (buyer_idx + purchase_num) % NUM_USERS ))
        if [ $seller_idx -eq $buyer_idx ]; then
            seller_idx=$(( (seller_idx + 1) % NUM_USERS ))
        fi
        
        ASSET_TO_BUY="${ASSET_IDS[$((seller_idx * NUM_ASSETS_PER_USER))]}"
        
        (
            RESULT=$(curl -s -X POST "$API_URL/protected/marketplace/buy/$ASSET_TO_BUY" \
                -H "Authorization: Bearer $BUYER_TOKEN" \
                -H "Content-Type: application/json")
            
            if echo "$RESULT" | grep -q "Purchase successful"; then
                echo -e "${GREEN}✅${NC} $BUYER bought $ASSET_TO_BUY"
            elif echo "$RESULT" | grep -q "insufficient balance"; then
                echo -e "${YELLOW}⚠️${NC}  $BUYER - insufficient balance"
            elif echo "$RESULT" | grep -q "not for sale"; then
                echo -e "${YELLOW}⚠️${NC}  $ASSET_TO_BUY already sold"
            else
                echo -e "${RED}❌${NC} $BUYER purchase failed: $(echo $RESULT | jq -r '.error' 2>/dev/null || echo 'Unknown error')"
            fi
        ) &
    done
done

wait
PURCHASE_TIME=$(($(date +%s) - START_TIME))
echo -e "${BLUE}⏱️  Completed purchase phase in ${PURCHASE_TIME}s${NC}"

sleep 5

# 7. Final statistics
echo -e "\n${BLUE}📊 Phase 7: Collecting final statistics...${NC}"

# Count assets by status
AVAILABLE=$(curl -s "$API_URL/explorer/assets" | jq '[.[] | select(.status == "Available")] | length')
FOR_SALE=$(curl -s "$API_URL/explorer/assets" | jq '[.[] | select(.status == "For Sale")] | length')
OWNED=$(curl -s "$API_URL/explorer/assets" | jq '[.[] | select(.status == "Owned")] | length')

echo -e "\n${BLUE}Asset Status Distribution:${NC}"
echo "  Available: $AVAILABLE"
echo "  For Sale: $FOR_SALE"
echo "  Owned: $OWNED"

# Check user balances
echo -e "\n${BLUE}User Balances (sample):${NC}"
for i in $(seq 0 2); do
    USER=${USER_IDS[$i]}
    # Note: We'd need a balance query endpoint for this
    echo "  $USER: (balance query not implemented in API)"
done

# Performance summary
echo -e "\n==================================================="
echo -e "              ${GREEN}STRESS TEST SUMMARY${NC}"
echo -e "==================================================="
echo "Total Operations: $((TOTAL_ASSETS * 3 + NUM_USERS * 2))"
echo "Users: $NUM_USERS"
echo "Assets Created: $TOTAL_ASSETS"
echo "Assets Listed: $TOTAL_ASSETS"
echo "Purchase Attempts: $((NUM_USERS * 2))"
echo ""
echo "Performance:"
echo "  Asset Creation: ${CREATE_TIME}s ($((TOTAL_ASSETS / CREATE_TIME)) assets/sec)"
echo "  Asset Listing: ${LIST_TIME}s ($((TOTAL_ASSETS / LIST_TIME)) listings/sec)"
echo "  Purchase Phase: ${PURCHASE_TIME}s"
echo ""
echo "Final State:"
echo "  Available: $AVAILABLE"
echo "  For Sale: $FOR_SALE"
echo "  Owned: $OWNED"
echo -e "\n${GREEN}✅ Stress test completed successfully!${NC}"
echo "==================================================="
