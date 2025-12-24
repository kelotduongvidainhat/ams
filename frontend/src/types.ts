export interface Asset {
    ID: string;
    name: string;
    type: string;
    owner: string;
    status: string;
    metadata_url: string;
    metadata_hash?: string;
    price?: number;
    currency?: string;
}

export interface User {
    id: string;
    full_name: string;
    identity_number: string;
    role: string;
    wallet_address?: string;
    status: string; // "Active" | "Locked"
    balance?: number;
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        role: string;
    }
}

export interface AssetHistory {
    txId: string;
    timestamp: string;
    record: Asset;
    isDelete: boolean;
}

export interface DashboardStats {
    total_users: number;
    total_assets: number;
    pending_transfers: number;
}

export interface UserStats extends User {
    has_wallet: boolean;
    joined_at: string;
}

export interface Approval {
    signer: string;
    role: string;
    timestamp: number;
    comment: string;
}

export interface PendingTransfer {
    asset_id: string;
    asset_name: string;
    current_owner: string;
    new_owner: string;
    status: string;
    created_at: number;
    expires_at: number;
    executed_at?: number;
    rejection_reason?: string;
    approvals: Approval[];
    // Helper fields from backend logic (if any kept, but we are raw now)
    // We might need to compute helpers on frontend
}

export interface PublicAsset {
    id: string;
    name: string;
    type: string;
    owner: string;
    status: string;
    metadata_url: string;
    last_tx_id?: string;
    price?: number;
    currency?: string;
}

