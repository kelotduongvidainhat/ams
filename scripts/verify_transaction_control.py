import requests
import json
import sys

BASE_URL = "http://localhost:3000/api"

def login(username, password):
    print(f"Logging in as {username}...")
    resp = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": password})
    if resp.status_code != 200:
        print(f"Failed to login {username}: {resp.text}")
        sys.exit(1)
    return resp.json()["token"]

def initiate_transfer(token, asset_id, new_owner):
    print(f"Initiating transfer of {asset_id} to {new_owner}...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(f"{BASE_URL}/protected/transfers/initiate", 
                         json={"asset_id": asset_id, "new_owner": new_owner},
                         headers=headers)
    if resp.status_code != 200:
        if "already exists" in resp.text:
            print("Transfer already exists, proceeding to verification.")
            return
        print(f"Failed to initiate transfer: {resp.text}")
        sys.exit(1)
    print("Transfer initiated successfully.")

def check_admin_transfers(token):
    print("Checking Admin Transaction Control...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/protected/admin/transfers", headers=headers)
    if resp.status_code != 200:
        print(f"Failed to fetch admin transfers: {resp.text}")
        sys.exit(1)
    
    transfers = resp.json()
    print(f"Found {len(transfers)} pending transfers.")
    print(json.dumps(transfers, indent=2))
    return transfers

def main():
    # 1. Login
    tomoko_token = login("Tomoko", "tomoko123")
    admin_token = login("admin", "admin123")

    # 2. Initiate Transfer (Tomoko -> Brad)
    try:
        initiate_transfer(tomoko_token, "asset101", "Brad")
    except Exception as e:
        print(f"Error initiating (might already exist): {e}")

    # 3. Check Admin View
    transfers = check_admin_transfers(admin_token)

    # 4. Verify asset101 is there
    found = False
    for tx in transfers:
        if tx["asset_id"] == "asset101" and tx["status"] == "PENDING":
            found = True
            approvals = tx.get("approvals", [])
            print(f"✅ Verified Transfer for asset101. Approvals: {len(approvals)}")
            # Check if signer info is present
            if len(approvals) > 0:
                print(f"   Signed by: {approvals[0]['signer']}")
            break
    
    if found:
        print("SUCCESS: Transaction Control Verification Passed.")
    else:
        print("FAILURE: Pending transfer not found in Admin view.")
        sys.exit(1)

if __name__ == "__main__":
    main()
