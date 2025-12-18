import axios from 'axios';
import type { Asset, User } from '../types';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getAssets = async (): Promise<Asset[]> => {
    const response = await api.get<Asset[]>('/assets');
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
