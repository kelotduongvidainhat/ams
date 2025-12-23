# 🔐 Privacy Patterns & Architecture Decisions

This document outlines the privacy strategies implemented in the AMS (Asset Management System) and analyzes the trade-offs of various Hyperledger Fabric privacy patterns.

## 🏗️ Architectural Decision: Hybrid Core Strategy

For complying with GDPR and protecting User Personally Identifiable Information (PII), we have adopted the **Hash & Off-chain (Hybrid Core)** strategy.

### Design
*   **On-Chain (The "Wallet")**:
    *   **Data**: `ID`, `Role`, `Balance`, `Status`.
    *   **Purpose**: Operational logic, RBAC, Atomic value transfer.
    *   **Privacy**: Pseudonymous. No PII.
*   **Off-Chain (The "Profile")**:
    *   **Data**: `FullName`, `IdentityNumber`, `Email`, `Bio`.
    *   **Storage**: PostgreSQL (Private Database).
    *   **Purpose**: User Experience, Rich Query, Identity Verification.

### Implementation Flow
1.  **Registration**:
    *   Backend receives registration request.
    *   Writes PII → **PostgreSQL**.
    *   Submits `CreateUser(ID, Role, Balance)` → **Blockchain**.
2.  **Synchronization**:
    *   Block Listener receives `UserCreated` event.
    *   Syncs *only* operational status to PostgreSQL (avoids overwriting PII).

### Why this choice?
We chose **Hash & Off-chain** because it provides the **Right to be Forgotten**. If a user requests deletion, we simply delete their row in PostgreSQL. The blockchain retains only a pseudonymous ID (`User123`) which cannot be linked back to a real person without the off-chain data, effectively anonymizing the immutable history.

---

## � Strategy Comparison Matrix

| Feature | **1. Hybrid Core (Hash & DB)** | **2. Transient Data** | **3. Private Data (PDC)** | **4. Crypto-Shredding** |
| :--- | :--- | :--- | :--- | :--- |
| **Data Location** | Off-Chain (SQL/NoSQL) | Memory (During Tx) | Peer SideDB (On-Chain*) | Ledger (Encrypted) |
| **Ledger Content** | Hash / ID Reference | Nothing | Hash | Encrypted Ciphertext |
| **"Right to be Forgotten"** | ✅ **Excellent** (Delete row) | N/A (Data ephemeral) | ⚠️ Hard (Purge config) | ⚠️ Risky (Delete Key) |
| **Performance** | 🚀 **High** (SQL Query) | High | Medium (Gossip overhead) | Low (Decrypt latency) |
| **Complexity** | Medium (Sync logic) | Low | High (Configs) | High (Key Mgmt) |
| **Best For** | **User PII, Large Files** | Passwords, Input Validation | B2B Confidentiality | Immutable Secrets |

---

## �🛡️ Comparison of Privacy Patterns

We evaluated four standard privacy patterns available in Hyperledger Fabric before choosing Hybrid Core.

### 1. Hash & Off-chain (Selected)
*   **Mechanism**: Store data in a private database; store only the Hash/ID on-chain.
*   **Pros**: 
    *   Fully GDPR compliant (True Deletion).
    *   High Performance (Large data stays off chain).
    *   Simple to query off-chain.
*   **Cons**:
    *   Requires managing a separate database.
    *   "Split-brain" risk if DB and Chain lose sync.

### 2. Transient Data & Events
*   **Mechanism**: Pass sensitive data in the `transient` field of a transaction. Data is available to Chaincode logic but **omitted** from the Orderer's block record.
*   **Use Case**: Passing Passwords, Credit Card numbers for validation.
*   **Verdict**: Good for **Input Privacy**, but not for *Storage*. We use this for passing authentication secrets, but not for storing the User Profile.

### 3. Private Data Collections (PDC)
*   **Mechanism**: Built-in Fabric feature. Data is stored in a local "SideDB" on authorized Peers only. The Ledger records only a hash. Data is shared via P2P Gossip.
*   **Use Case**: B2B Confidentiality (e.g., Supplier pricing visible only to Buyer and Seller, hidden from Regulator).
*   **Verdict**: **Overkill** for this system.
    *   Adds significant operational complexity (Collection Configs).
    *   "Purging" data is possible but complex.
    *   Data is still effectively "on-chain" (on Peer nodes), making absolute deletion harder to guarantee than a SQL `DELETE`.

### 4. Crypto-Shredding
*   **Mechanism**: Encrypt data before storing on-chain. To "delete" data, you destroy the Decryption Key.
*   **Use Case**: When data *must* be replicated on-chain but logically deletable.
*   **Verdict**: **Risky**.
    *   If the key is ever compromised (now or in 20 years via Quantum Computing), the "deleted" data becomes visible again.
    *   Encrypted blobs bloat the ledger size.

---

## 📝 Regulatory Compliance Cheatsheet

| Requirement | Hybrid Core Solution |
| :--- | :--- |
| **Right to be Forgotten** | ✅ DELETE from SQL. ID remains but is anonymous. |
| **Data Minimization** | ✅ Only Role/Balance stored on ledger. |
| **Immutability (Audit)** | ✅ Ledger proves *when* a User was created/promoted. |
| **Access Control** | ✅ RBAC (Roles) enforced by immutable Chaincode. |
