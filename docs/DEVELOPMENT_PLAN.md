# 🗺️ AMS Development Roadmap

This document outlines the strategic development plan for the Asset Management System (AMS) following the successful completion of the NFT Marketplace module.

## 📅 Phase 1: Polish & Optimization (Immediate)
*Focus: Technical Debt, UX Refinement, and Stability.*

### 1.1 UX Enhancements
- [ ] **Global Balance Display**: Show user credit balance in the global Navbar (currently only in Marketplace tab).
- [ ] **Toast Notifications**: Replace simple alerts with professional toast notifications (Success/Error).
- [ ] **Loading States**: Add skeletons or spinners for all async actions (Marketplace loading).

### 1.2 Performance Engineering
- [ ] **Composite Key Support** (`Option`): Refactor Chaincode to use `CreateCompositeKey` for `status~assetID` and `owner~assetID`.
    - *Goal*: Eliminate `GetStateByRange` for faster queries as dataset grows.
- [ ] **Asset Pagination**: Implement pagination for `GetAllAssets` (currently fetches all).

## 📅 Phase 2: Advanced Marketplace Features (Next Milestone)
*Focus: Expanding the economy and interaction models.*

### 2.1 Multi-Currency Support
- [ ] Update Asset struct to support keys other than 'USD'.
- [ ] Implement Currency Exchange Logic (Oracle integration or Admin-set rates).

### 2.2 Auction System
- [ ] **Bidding Engine**: Allow users to place bids on assets.
- [ ] **Time-lock Logic**: Assets locked until auction expiry.
- [ ] **Highest Bidder Win**: Auto-transfer to winner.

### 2.3 Escrow Service
- [ ] **Secure Swap**: Implementation of third-party or code-based escrow for high-value transfers.

## 📅 Phase 3: Ecosystem Expansion (Future)
*Focus: Scalability, Public Access, and Decentralization.*

### 3.1 Network Federation
- [ ] **Multi-Org Setup**: Onboard a second organization (e.g., "AuditorOrg" or "PartnerOrg") to validate transactions.
- [ ] **Raft Consensus Tuning**: Optimize block size and batch timeouts for higher throughput.

### 3.2 Public Integration
- [ ] **IPFS Decentralization**: Fully replace URL metadata with IPFS CIDs pinned by cluster.
- [ ] **Mobile App**: React Native wrapper for mobile portfolio management.

### 3.3 Analytics & Reporting
- [ ] **Dashboard Analytics**: Price history charts, Volume tracking.
- [ ] **Admin Reports**: Exportable CSV/PDF audit logs.

---

## 🛠️ Maintenance Schedule

| Frequency | Task | Description |
| :--- | :--- | :--- |
| **Weekly** | Dependency Audits | `npm audit` and `go list -m -u all` |
| **Bi-Weekly** | Backup Verification | Test restore from PostgreSQL dumps |
| **Monthly** | Stress Testing | Run `stress_test.sh` to benchmark throughput |
