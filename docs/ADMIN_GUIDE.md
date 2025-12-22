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
