# AMS Feature Checklist

This document tracks the implementation status of features defined in the project scope.

## 🔴 Must Have (Core Architecture & Logic)
These features are critical for the system to function as a private blockchain asset management platform.

- [x] **Network Architecture**: 1 Organization, 3 Orderers (Raft), 3 Peers.
- [x] **Chaincode-as-a-Service (CCAAS)**: External builders and Docker deployment.
- [x] **Asset Management Smart Contract**:
    - [x] Create Asset (ID, Name, Type, Owner, Status, Metadata)
    - [x] Update Asset (Name, Status, Metadata)
    - [x] Verify Metadata Hash (SHA-256 integrity)
- [x] **Multi-Signature Transfer System**:
    - [x] Initiate Transfer (Lock asset)
    - [x] Recipient Approval
    - [x] 24-hour expiration logic
- [x] **Wallet-as-a-Service (WaaS)**:
    - [x] API Registration (`/api/wallet/register`)
    - [x] Auto-enroll with Fabric CA
    - [x] Auto-create user on Ledger
- [x] **Security & Administration**:
    - [x] RBAC (Admin/User/Auditor roles)
    - [x] User Locking (On-chain status)
- [x] **Backend API Gateway**:
    - [x] Fiber (Golang) Framework
    - [x] JWT Authentication & bcrypt
    - [x] Protected Routes
- [x] **Frontend Web Application**:
    - [x] Login/Auth Pages
    - [x] Dashboard & Asset List
    - [x] Transfer Management UI
- [x] **Hybrid Architecture**:
    - [x] PostgreSQL Sync Service (Events -> DB)
    - [x] Off-chain Database Schema

## 🟡 Need to Have (Operational & UX)
Important features for usability and production readiness.

- [x] **Automation Scripts**:
    - [x] `setup.sh` (Dependencies)
    - [x] `fresh_start.sh` (One-click deploy)
    - [x] `enrollUser.sh` (Identity management)
- [x] **Public Explorer**:
    - [x] Public read-only access to assets
    - [x] Search filters (Name, Owner, Type)
- [x] **Access Control (Grant Access)**:
    - [x] Private by default
    - [x] Share with specific viewers
- [x] **History Tracking**:
    - [x] Full audit log of asset modifications
    - [x] Visual timeline in Frontend

## 🟢 Option (Future Works / Extensions)
Planned features for future releases (Phase 8).

- [ ] **Dashboard Analytics**: Advanced graphs and stats.
- [ ] **Network Expansion**: Multi-organization setup (e.g., Org1, Org2).
- [x] **IPFS Integration**: Decentralized storage for metadata files instead of HTTP URLs.
- [ ] **Composite Key Refactor**: Optimize status checks using `status~userID` keys.
- [ ] **WebSocket Integration**: Real-time frontend updates (replace 30s polling).
- [ ] **Nginx Load Balancer**: Unified entry point for SSL termination and static file serving.
- [ ] **Redis Caching**: Cache expensive queries (for High-Traffic Public Explorer).
- [ ] **Advanced Monitoring**: Prometheus/Grafana stack for network health metrics.

## 🔵 NFT Marketplace Extension (Proposed)
Transform the asset management system into a trading platform.

- [ ] **Marketplace Smart Contract Enhancements**:
    - [ ] Add `Price` and `Currency` fields to Asset struct.
    - [ ] Implement `ListAsset` (Set price & "For Sale" status).
    - [ ] Implement `DelistAsset` (Remove from market).
- [ ] **Settlement Mechanisms**:
    - [ ] Option A: Off-chain Settlement (Status locking & Manual confirmation).
    - [ ] Option B: On-chain Credits (Internal token/balance system).
    - [ ] Implement `BuyAsset` (Atomic ownership transfer & payment).
- [ ] **Marketplace UI**:
    - [ ] "Buy Now" flow for buyers.
    - [ ] "List for Sale" flow for owners.
    - [ ] "For Sale" filters in Public Explorer.
