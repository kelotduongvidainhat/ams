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
