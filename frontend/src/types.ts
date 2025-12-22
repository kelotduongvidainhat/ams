export interface Asset {
    ID: string;
    name: string;
    type: string;
    owner: string;
    status: string;
    metadata_url: string;
    metadata_hash?: string;
}

export interface User {
    id: string;
    full_name: string;
    identity_number: string;
    role: string;
    wallet_address?: string;
    status: string; // "Active" | "Locked"
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

export interface PendingTransfer {
    id: number;
    asset_id: string;
    current_owner: string;
    new_owner: string;
    status: string;
    created_at: string;
}

export interface PublicAsset {
    id: string;
    name: string;
    type: string;
    owner: string;
    status: string;
    metadata_url: string;
    last_tx_id?: string;
}
