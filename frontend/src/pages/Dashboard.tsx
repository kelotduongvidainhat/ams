import { useEffect, useState } from 'react';
import { getAssets } from '../services/api';
import type { Asset } from '../types';
import AssetCard from '../components/AssetCard';
import { Loader2, AlertCircle } from 'lucide-react';

export default function Dashboard() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await getAssets();
            setAssets(data);
        } catch (err) {
            setError('Failed to fetch assets from Blockchain.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-red-400">
                <AlertCircle className="w-12 h-12" />
                <p className="text-lg font-medium">{error}</p>
                <button
                    onClick={() => { setLoading(true); setError(null); fetchData(); }}
                    className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition">
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Asset Portfolio</h1>
                    <p className="text-slate-400">Manage and track your commercial assets secured by Hyperledger Fabric.</p>
                </div>
                <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-3">
                    <span className="text-sm text-slate-400 uppercase tracking-wider font-semibold">Total Value</span>
                    <span className="text-2xl font-bold text-white">
                        ${assets.reduce((sum, a) => sum + a.value, 0).toLocaleString()}
                    </span>
                </div>
            </div>

            {assets.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    No assets found on the blockchain.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {assets.map((asset) => (
                        <AssetCard key={asset.ID} asset={asset} />
                    ))}
                </div>
            )}
        </div>
    );
}
