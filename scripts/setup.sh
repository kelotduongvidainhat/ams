#!/bin/bash
set -e

# AMS Project Setup Script
# This script ensures that all dependencies are installed and the environment is ready for 'fresh_start.sh'.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== AMS Project Setup ===${NC}"

# 1. Check System Dependencies
echo -e "\n${YELLOW}--- Checking System Dependencies ---${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}[ERROR] Docker is not installed.${NC} Please install Docker first."
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}[ERROR] Docker Compose is not installed.${NC} Please install Docker Compose."
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose is installed${NC}"

if ! command -v go &> /dev/null; then
    echo -e "${YELLOW}[WARN] Go is not installed.${NC} Required for local backend development."
else
    echo -e "${GREEN}✓ Go is installed${NC}"
fi

if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}[WARN] Node.js is not installed.${NC} Required for local frontend development."
else
    echo -e "${GREEN}✓ Node.js is installed${NC}"
fi

if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}[WARN] jq is not installed.${NC} Installing jq..."
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update && sudo apt-get install -y jq
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install jq
    else
        echo -e "${RED}[ERROR] Could not install jq automatically. Please install 'jq' manually.${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ jq is installed${NC}"

# 2. Check Fabric Binaries
echo -e "\n${YELLOW}--- Checking Hyperledger Fabric Binaries ---${NC}"

if [ ! -d "bin" ] || [ ! -f "bin/peer" ] || [ ! -d "config" ]; then
    echo -e "Fabric binaries or config missing. Downloading..."
    # Download install-fabric.sh and run it
    curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh
    chmod +x install-fabric.sh
    ./install-fabric.sh --fabric-version 2.5.9 --ca-version 1.5.12 binary config
    rm install-fabric.sh
    echo -e "${GREEN}✓ Fabric binaries downloaded${NC}"
else
    echo -e "${GREEN}✓ Fabric binaries already present${NC}"
fi

# 3. Permission Setup
echo -e "\n${YELLOW}--- Setting Permissions ---${NC}"
chmod +x scripts/*.sh
chmod +x network/*.sh

echo -e "${GREEN}✓ Permissions set${NC}"

echo -e "\n${GREEN}=== Setup Complete! ===${NC}"
echo -e "You can now run the project with:"
echo -e "${YELLOW}sudo ./scripts/fresh_start.sh${NC}"
