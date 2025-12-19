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
