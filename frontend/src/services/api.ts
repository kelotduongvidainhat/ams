import axios from 'axios';
import type { Asset, User, AssetHistory } from '../types';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// export const getAssets = async (): Promise<Asset[]> => {
//     const response = await api.get<Asset[]>('/assets');
//     return response.data;
// };
// Updated to accept filters
export const getAssets = async (userId?: string, role?: string): Promise<Asset[]> => {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (role) params.append('user_role', role);

    const response = await api.get<Asset[]>(`/assets?${params.toString()}`);
    return response.data;
};

export const grantAccess = async (id: string, viewerId: string) => {
    const response = await api.post(`/assets/${id}/access`, { viewer_id: viewerId });
    return response.data;
};

export const createAsset = async (asset: Partial<Asset>) => {
    const response = await api.post('/assets', {
        ...asset,
        id: asset.ID, // Backend expects "id" (lowercase) but our interface uses ID (uppercase) from Go. Adjusting mapping if needed.
        // Wait, backend struct tags say `json:"id"`. But output from GetAllAssets has uppercase ID because it just dumps the struct.
        // Let's standarize to use what the backend API expects in POST.
        // The backend POST expects: id, name, type...
        metadata_url: asset.metadata_url,
    });
    return response.data;
};

// --- User API ---

export const registerUser = async (user: User) => {
    const response = await api.post('/users', user);
    return response.data;
};

export const getUser = async (id: string): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
};

export const getAssetHistory = async (id: string): Promise<AssetHistory[]> => {
    const response = await api.get<AssetHistory[]>(`/assets/${id}/history`);
    return response.data;
};

export const transferAsset = async (id: string, newOwner: string) => {
    const response = await api.put(`/assets/${id}/transfer`, { new_owner: newOwner });
    return response.data;
};

// --- Explorer API (Postgres) ---
export const searchAssets = async (query: string, owner?: string, type?: string): Promise<Asset[]> => {
    const params = new URLSearchParams();
    if (query) params.append('search', query);
    if (owner) params.append('owner', owner);
    if (type) params.append('type', type);

    const response = await api.get<Asset[]>(`/explorer/assets?${params.toString()}`);
    return response.data;
};

export interface Transaction {
    tx_id: string;
    asset_id: string;
    asset_name: string;
    asset_type: string;
    action_type: string;
    to_owner: string;
    value: number;
    timestamp: string;
}

export const getRecentTransactions = async (): Promise<Transaction[]> => {
    const response = await api.get<Transaction[]>('/explorer/transactions');
    return response.data;
};
