export interface Asset {
    ID: string;
    name: string;
    type: string;
    owner: string;
    value: number;
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
