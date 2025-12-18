import axios from 'axios';
import type { Asset } from '../types';

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
