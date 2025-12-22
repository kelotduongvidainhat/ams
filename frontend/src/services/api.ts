import axios from 'axios';
import type { Asset, User, AssetHistory, DashboardStats, UserStats } from '../types';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Auth Token Management
let authToken: string | null = localStorage.getItem('ams_token');

export const setAuthToken = (token: string | null) => {
    authToken = token;
    if (token) {
        localStorage.setItem('ams_token', token);
    } else {
        localStorage.removeItem('ams_token');
    }
};

api.interceptors.request.use((config) => {
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
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
    const response = await api.post(`/protected/assets/${id}/access`, { viewer_id: viewerId });
    return response.data;
};

export const createAsset = async (asset: Partial<Asset>) => {
    const response = await api.post('/protected/assets', { // Use Protected Route
        ...asset,
        id: asset.ID,
        metadata_url: asset.metadata_url,
    });
    return response.data;
};

// --- User API ---

export const login = async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
};

export const registerUser = async (user: any) => {
    // Map to Wallet Request structure
    const payload = {
        username: user.id || user.username,
        password: user.password,
        full_name: user.full_name,
        identity_number: user.identity_number
    };
    const response = await api.post('/wallet/register', payload);
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

// Multi-Signature Transfer Functions
export const initiateTransfer = async (assetId: string, newOwner: string) => {
    const response = await api.post('/protected/transfers/initiate', {
        asset_id: assetId,
        new_owner: newOwner
    });
    return response.data;
};

export const getPendingTransfers = async () => {
    const response = await api.get('/protected/transfers/pending');
    return response.data;
};

export const approveTransfer = async (assetId: string) => {
    const response = await api.post(`/protected/transfers/${assetId}/approve`);
    return response.data;
};

export const rejectTransfer = async (assetId: string, reason: string) => {
    const response = await api.post(`/protected/transfers/${assetId}/reject`, { reason });
    return response.data;
};

export const updateAsset = async (id: string, updates: { name: string; status: string; metadata_url: string }) => {
    const response = await api.put(`/protected/assets/${id}`, updates);
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
    timestamp: string;
}

export const getRecentTransactions = async (): Promise<Transaction[]> => {
    const response = await api.get<Transaction[]>('/explorer/transactions');
    return response.data;
};

// --- Admin API ---

export const getDashboardStats = async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/protected/admin/dashboard');
    return response.data;
};

export const getAllUsers = async (): Promise<UserStats[]> => {
    const response = await api.get<UserStats[]>('/protected/admin/users');
    return response.data;
};

export const setUserStatus = async (userId: string, status: 'Active' | 'Locked') => {
    const response = await api.post(`/protected/admin/users/${userId}/status`, { status });
    return response.data;
};
