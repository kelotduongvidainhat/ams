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
