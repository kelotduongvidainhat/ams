import { useState } from 'react';
import { listAssetForSale } from '../services/api';

interface ListAssetModalProps {
    asset: {
        ID: string;
        name: string;
        type: string;
    };
    onClose: () => void;
    onSuccess: () => void;
}

export default function ListAssetModal({ asset, onClose, onSuccess }: ListAssetModalProps) {
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            setError('Please enter a valid price greater than 0');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await listAssetForSale(asset.ID, priceNum);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to list asset');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold mb-4">List Asset for Sale</h2>

                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Asset</p>
                    <p className="font-semibold">{asset.name}</p>
                    <p className="text-sm text-gray-500">{asset.type}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Price (USD)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter price"
                            required
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? 'Listing...' : 'List for Sale'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
