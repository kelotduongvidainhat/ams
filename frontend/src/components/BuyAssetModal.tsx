import { useState } from 'react';
import { buyAsset } from '../services/api';

interface BuyAssetModalProps {
    asset: {
        ID?: string;
        id?: string;
        name: string;
        type: string;
        owner: string;
        price?: number;
        currency?: string;
    };
    userBalance?: number;
    onClose: () => void;
    onSuccess: () => void;
}

export default function BuyAssetModal({ asset, userBalance = 0, onClose, onSuccess }: BuyAssetModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const assetId = asset.ID || asset.id || '';
    const price = asset.price || 0;
    const currency = asset.currency || 'USD';

    const canAfford = userBalance >= price;

    const handleBuy = async () => {
        if (!canAfford) {
            setError('Insufficient balance');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await buyAsset(assetId);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to purchase asset');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h2 className="text-2xl font-bold mb-4">Purchase Asset</h2>

                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Asset</p>
                    <p className="font-semibold text-lg">{asset.name}</p>
                    <p className="text-sm text-gray-500">{asset.type}</p>
                    <p className="text-xs text-gray-400 mt-1">Seller: {asset.owner}</p>
                </div>

                <div className="mb-6 space-y-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-gray-700">Price</span>
                        <span className="font-bold text-xl text-blue-600">
                            {price.toFixed(2)} {currency}
                        </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-700">Your Balance</span>
                        <span className={`font-semibold ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
                            {userBalance.toFixed(2)} {currency}
                        </span>
                    </div>

                    <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg border-2 border-gray-300">
                        <span className="font-medium text-gray-700">Balance After Purchase</span>
                        <span className={`font-bold ${canAfford ? 'text-gray-900' : 'text-red-600'}`}>
                            {(userBalance - price).toFixed(2)} {currency}
                        </span>
                    </div>
                </div>

                {!canAfford && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                            ⚠️ Insufficient balance. You need {(price - userBalance).toFixed(2)} more {currency}.
                        </p>
                    </div>
                )}

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
                        type="button"
                        onClick={handleBuy}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading || !canAfford}
                    >
                        {loading ? 'Processing...' : 'Buy Now'}
                    </button>
                </div>
            </div>
        </div>
    );
}
