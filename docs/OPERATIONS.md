# 🛡️ AMS Admin & Security Guide

This document detailed key features for the **System Admin**, including user management, user locking, and system monitoring.

## 🔑 Credentials & Roles

The system uses Role-Based Access Control (RBAC). Key accounts:

| Username | Role | Permissions | Note |
| :--- | :--- | :--- | :--- |
| **`admin`** | **Admin** | Full Access: Lock Users, View System Stats | System Administrator |
| **`auditor`** | **Auditor** | Read-Only: View history & transactions | Compliance Officer |
| `Tomoko`, `Brad`, ... | `User` | Asset Management (Own assets only) | End Users |

---

## 🚫 User Locking Protocol

The **User Locking** feature allows Admins to prevent specific users from logging in or performing transactions.

### 1. Locking Flow

1.  **Status Check**: Admin checks the current user status.
2.  **Lock Event**: Admin sends a `SetUserStatus` command to the Blockchain.
3.  **Sync**: The "Locked" status is synced to the off-chain Database.
4.  **Enforcement**:
    *   **Login**: Denied immediately (Status 403 Forbidden).
    *   **Transactions**: Rejected by Chaincode (Logic checks Status).

### 2. How to Perform

#### Via Dashboard (UI)
1.  Log in with the `admin` account.
2.  Go to the **Admin Dashboard** tab.
3.  Find the User in the **Identity Management** list.
4.  Click the **Lock** button (icon 🔓 -> 🔒).
5.  Confirm the action.

#### Via API (For Dev/Scripts)

**Lock User:**
```bash
curl -X POST http://localhost:3000/api/protected/admin/users/Tomoko/status \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "Locked"}'
```

**Unlock User:**
```bash
curl -X POST http://localhost:3000/api/protected/admin/users/Tomoko/status \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "Active"}'
```

---

## 📊 Admin Dashboard Features

The dedicated Admin Dashboard provides an overview of system health:

1.  **Overview Analytics**:
    *   Total Users.
    *   Total Assets.
    *   Pending Transfers count.
    
2.  **Identity Management**:
    *   List of 50 most recent users.
    *   Displays: Full Name, Role, Wallet Status, **Account Status**.
    *   Action: Lock/Unlock.

3.  **Network Health** (Placeholder):
    *   Peers/Orderers Status.
    *   Chaincode Status.

---

## 🛠️ Admin API Endpoints

All endpoints below require `Authorization: Bearer <token>` and `Admin` Role.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/protected/admin/dashboard` | Get general stats (User/Asset count). |
| `GET` | `/api/protected/admin/users` | Get list of all users + status. |
| `POST` | `/api/protected/admin/users/:id/status` | Change status (Active/Locked). |
| `GET` | `/api/protected/admin/health` | Check network health. |
| `GET` | `/api/protected/admin/transfers` | View all pending transactions. |
| `GET` | `/api/protected/admin/assets` | View all assets (Admin view). |

---

## 🧪 Testing

Use the automated script to test the Locking feature:

```bash
./scripts/test_locking.sh
```

**Test Cases Include:**
1. ✅ Admin login successful.
2. ✅ Check Tomoko status (Active).
3. ✅ Lock user Tomoko -> Status changes to Locked.
4. ✅ Tomoko attempts login -> **DENIED**.
5. ✅ Unlock user Tomoko -> Status changes to Active.
6. ✅ Tomoko logins again -> **SUCCESS**.

---

## 📅 Comprehensive Admin Dashboard Implementation Plan

### Goal
Implement a full-featured Admin Dashboard separated from the standard User View. The dashboard will be organized into 5 specific modules to manage the entire system effectively.

### Modules Overview
1.  **Overview Analytics**: High-level system metrics (Users, Assets, Transfers).
2.  **Identity Management**: Manage users, roles, and access security (Lock/Unlock).
3.  **Asset & Audit**: Global view of all assets and their provenance/history.
4.  **Transaction Control**: Monitor and audit pending multi-sig transfers.
5.  **Network Configuration**: View blockchain network health, peers, and configuration status.

### Proposed Changes

#### 1. Smart Contract (Chaincode)
*   **Identity**: Update `User` struct with `Status` field ("Active", "Locked"). Add `SetUserStatus` function. (✅ Done)
*   **Transactions**: Ensure `GetAllPendingTransfers` is accessible to Admin. (✅ Done)

#### 2. Database Schema & Sync
*   **Schema**: Add `status` column to `users` table. (✅ Done)
*   **Sync Listener**: Sync `UserStatusUpdated` events to Postgres. (✅ Done)

#### 3. Backend Service (`backend/admin`)
*   **Analytics**: Enhance `getDashboardStats`. (✅ Done)
*   **Identity**: Add `setUserStatus` endpoint. (✅ Done)
*   **Assets**: Add `getAllAssets` (admin logs) endpoint. (✅ Done)
*   **Transactions**: Add `getAllPendingTransfers` (admin view) endpoint. (✅ Done)
*   **Network**: Enhance `/health` endpoint to return network details. (✅ Done)

#### 4. Frontend Application (`frontend/src`)
*   **Dashboard.tsx**: Ensure strict separation. If Admin, show only Admin Dashboard.
*   **AdminLayout.tsx**: Sidebar navigation for the 5 modules.
*   **New Modules**: `components/admin/modules/`
    *   `Analytics.tsx`: Stats cards and charts.
    *   `IdentityManagement.tsx`: User list with Lock/Unlock actions.
    *   `AssetAudit.tsx`: Table of all assets with "View History" action.
    *   `TransactionControl.tsx`: List of pending/past transfers.
    *   `NetworkConfig.tsx`: System health and parameter display.

### Verification Plan

#### Automated Tests
*   Update `scripts/test_admin.sh` to hit new endpoints.

#### Manual Verification
1.  **Fresh Start**: Run `sudo ./scripts/fresh_start.sh`.
2.  **Admin Experience**:
    *   Login as `admin`.
    *   Verify all 5 tabs load data correctly.
3.  **Identity**: Lock `Tomoko` and verify she cannot login.
4.  **Audit**: Check history of an asset.


---


---

## 💰 Marketplace Operations

### 1. Credit Management (Minting)
Admins can issue (mint) credits to users. This is primarily for testing or initial funding as there is no fiat payment gateway yet.

**API Endpoint**:
`POST /api/protected/marketplace/mint`

**Example**:
```bash
curl -X POST http://localhost:3000/api/protected/marketplace/mint \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"target_user_id":"Brad", "amount": 1000}'
```

### 2. Monitoring Transactions
Admins can view all asset transfers in the system via the Database or Blockchain events.

*   **Database**: Check `asset_history` table for `action_type = 'TRANSFER'`.
*   **Logs**: Check Backend logs for "BuyAsset" success messages.

---

# 📜 Utility Scripts Guide

This folder contains shell scripts to automate the lifecycle of the AMS network and application.

## Core Scripts

### `fresh_start.sh`
**Usage**: `sudo ./scripts/fresh_start.sh`
**Purpose**: The "God Script". Deletes everything, starts the network, deploys chaincode, builds the app, and populates sample data. Use this for a clean slate.

### `enrollUser.sh`
**Usage**: `./scripts/enrollUser.sh <username> <password>`
**Purpose**: Registers a new user with the Fabric CA and generates their cryptographic material (wallet) in the `wallets/` directory.

### `init_schema.sh`
**Usage**: `./scripts/init_schema.sh`
**Purpose**: Connects to the running PostgreSQL container and applies the `database/schema.sql`.

### `create_sample_data.sh`
**Usage**: `./scripts/create_sample_data.sh`
**Purpose**: Calls the backend API to create a set of dummy assets for testing purposes.

### `sync_users.sh`
**Usage**: `./scripts/sync_users.sh`
**Purpose**: Forces a sync of all identities from the Hyperledger Fabric ledger into the PostgreSQL `users` table.

### `add_passwords.sh`
**Usage**: `./scripts/add_passwords.sh`
**Purpose**: Sets the login password for users in PostgreSQL (since the Blockchain identity does not have a "login password").

### `test_locking.sh`
**Usage**: `./scripts/test_locking.sh`
**Purpose**: An end-to-end test script to verify the Admin User Locking protocol.
1. Logs in as Admin.
2. Locks a user.
3. Verifies user cannot log in.
4. Unlocks user.
5. Verifies user can log in.

## Network Scripts (in `network/`)

### `network.sh`
**Usage**: `./network.sh up | down | createChannel | deployCC`
**Purpose**: The official Hyperledger Fabric test network script, customized for this project.

### `start_node_full.sh`
**Usage**: `./start_node_full.sh`
**Purpose**: Starts a peer node with Chaincode-as-a-Service configured.


---


# AMS User Accounts & Passwords Reference

## 🔐 User Accounts Overview

### **All Users (Blockchain Wallet + Password)**

Every user in the system now has **both** a Fabric CA wallet for blockchain transactions AND a password for frontend login:

| Username | Password | Full Name | Role | Identity Number |
|----------|----------|-----------|------|-----------------|
| `demo_user` | `demo123` | Demo User | User | DEMO001 |
| `Tomoko` | `tomoko123` | Tomoko | User | ID002 |
| `Brad` | `brad123` | Brad | User | ID003 |
| `JinSoo` | `jinsoo123` | Jin Soo | User | ID004 |
| `Max` | `max123` | Max | User | ID005 |
| `Adriana` | `adriana123` | Adriana | User | ID006 |
| `Michel` | `michel123` | Michel | User | ID007 |
| `admin` | `admin123` | System Admin | Admin | ID000 |
| `auditor` | `auditor123` | Auditor One | Auditor | ID999 |
| `user01` | `user01123` | User One | User | ID001 |

**✅ All users can:**
- Login to the frontend (http://localhost:5173)
- Sign blockchain transactions (via Fabric CA wallet)
- Access protected API endpoints (via JWT)

---

## 🔧 How to Add Password to a New User

### Method 1: Complete Registration (Wallet + Password)
For a **brand new user**, use the wallet registration endpoint:

```bash
curl -X POST http://localhost:3000/api/wallet/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "password": "alice123",
    "full_name": "Alice Smith",
    "identity_number": "ID100"
  }'
```

This will:
1. Register with Fabric CA
2. Enroll and create wallet
3. Create user on blockchain
4. Store password hash in PostgreSQL

### Method 2: Set Password for Existing User
For users who already exist on the blockchain but don't have a password:

```bash
curl -X POST http://localhost:3000/api/auth/set-password \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "existing_user",
    "password": "newpassword123"
  }'
```

**Note:** The user must already be synced to PostgreSQL (happens automatically after any blockchain transaction).

---

## 🧪 Testing Login

### Via Frontend:
1. Open: http://localhost:5173
2. Login with:
   - **Username:** `demo_user`
   - **Password:** `demo123`

### Via API:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"demo_user","password":"demo123"}'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "demo_user",
    "role": "User"
  }
}
```

---

## 🔑 Password Management Best Practices

1. **Default Test Password:** `demo123` (for demo_user)
2. **Production:** Use environment variables for JWT secret
3. **Password Requirements:** Currently no validation (add in production)
4. **Password Reset:** Not implemented yet (manual DB update required)

---

## 📊 Current Database Status

Run this to check password status:
```bash
docker exec -i ams-postgres psql -U ams_user -d ams_db -c \
  "SELECT id, full_name, role, 
   CASE WHEN password_hash IS NOT NULL THEN '✓ Has Password' ELSE '✗ No Password' END 
   FROM users ORDER BY id;"
```

---

## 🚨 Security Notes

- Passwords are hashed using **bcrypt** (cost factor: 14)
- JWT tokens expire after **24 hours**
- Secret key is currently hardcoded (change in production!)
- No rate limiting on login endpoint (add in production)
