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
