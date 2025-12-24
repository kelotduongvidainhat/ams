import requests
import json
import sys
import time

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
            print("Transfer already exists.")
            return
        print(f"Failed to initiate transfer: {resp.text}")
        sys.exit(1)
    print("Transfer initiated successfully.")

def approve_transfer(token, asset_id):
    print(f"Approving transfer of {asset_id}...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.post(f"{BASE_URL}/protected/transfers/{asset_id}/approve", headers=headers)
    if resp.status_code != 200:
        print(f"Failed to approve transfer: {resp.text}")
        sys.exit(1)
    print("Transfer approved successfully.")

def check_admin_transfers(token, asset_id, expected_status):
    print(f"Checking Admin View for {asset_id} (Expected: {expected_status})...")
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/protected/admin/transfers", headers=headers)
    if resp.status_code != 200:
        print(f"Failed to fetch admin transfers: {resp.text}")
        sys.exit(1)
    
    transfers = resp.json()
    found = False
    for tx in transfers:
        if tx["asset_id"] == asset_id:
            found = True
            print(f"Found transfer: Status={tx['status']}")
            if tx['status'] == expected_status:
                print(f"✅ Status matched: {expected_status}")
            else:
                print(f"❌ Status mismatch! Expected {expected_status}, got {tx['status']}")
                sys.exit(1)
            break
    
    if not found:
        print(f"❌ Transfer {asset_id} not found in Admin view!")
        sys.exit(1)

def main():
    # 1. Login
    tomoko_token = login("Tomoko", "tomoko123")
    brad_token = login("Brad", "brad123")
    admin_token = login("admin", "admin123")

    asset_id = "asset101" # Luxury Penthouse

    # 2. Initiate (Tomoko -> Brad)
    initiate_transfer(tomoko_token, asset_id, "Brad")

    # 3. Verify PENDING
    check_admin_transfers(admin_token, asset_id, "PENDING")

    # 4. Approve (Brad)
    approve_transfer(brad_token, asset_id)
    
    # 5. Verify EXECUTED
    # Wait a moment for blockchain to commit/indexing? Admin queries blockchain directly, so instant.
    time.sleep(2) 
    check_admin_transfers(admin_token, asset_id, "EXECUTED")

    print("\n🎉 SUCCESS: Full Transfer Lifecycle Verified (PENDING -> EXECUTED)")

if __name__ == "__main__":
    main()
