# Asset Locking Feature Manual

## Overview
The Asset Locking feature provides Administrators with the ability to "freeze" any asset in the system. When an asset is locked, all write operations on it are suspended. This is critical for halting suspicious activity, legal compliance, or resolving disputes.

## Capabilities

### 1. Lock Asset (Admin Only)
*   **Action**: Sets the asset status to `Locked`.
*   **Effect**:
    *   Cannot be Updated (Name, Metadata).
    *   Cannot be Transferred.
    *   Cannot be Listed on Marketplace.
    *   Cannot be Deleted.
*   **Audit**: Emits `AssetLocked` event on the blockchain.

### 2. Unlock Asset (Admin Only)
*   **Action**: Sets the asset status to `Available` (or previous state).
*   **Effect**: Restores full functionality to the asset owner.
*   **Audit**: Emits `AssetUnlocked` event.

### 3. Visual Indicators
*   **Admin Dashboard**: Locked assets are clearly marked with a lock icon.
*   **Marketplace**: Locked assets are hidden or disabled from listing.

## Technical Implementation

### Chaincode (`asset-transfer-basic`)
*   **Function**: `LockAsset(ctx, assetID)`
*   **Function**: `UnlockAsset(ctx, assetID)`
*   **Checks**: Added Status == "Locked" checks to `UpdateAsset`, `TransferAsset`, `DeleteAsset`, `InitiateTransfer`, `ListAsset`.

### Backend API
*   `POST /api/protected/admin/assets/:id/lock`: Locks the asset.
*   `POST /api/protected/admin/assets/:id/unlock`: Unlocks the asset.
*   **Event Listener**: Syncs `AssetLocked` and `AssetUnlocked` events to the PostgreSQL database for real-time querying.

### Frontend
*   **Asset Audit Module**: Includes "Lock/Unlock" toggle button.
*   **Optimistic UI**: Interface updates immediately for better UX, then syncs with the confirmed database state after a short delay.

## Security
*   **RBAC**: Only users with the `admin` role (verified via JWT and Enrollment ID) can invoke lock/unlock functions.
*   **Identity Verification**: All other functions verify that the caller is the owner and that the asset is not locked.
