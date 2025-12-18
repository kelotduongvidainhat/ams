import { useState, useEffect } from 'react';
import { Search, ShieldCheck, ListFilter, Activity } from 'lucide-react';
import HistoryModal from './HistoryModal';
import { getAssets } from '../services/api';
import AssetCard from './AssetCard';
import type { Asset, User } from '../types';

interface AuditorDashboardProps {
    currentUser: User;
}

export default function AuditorDashboard({ currentUser }: AuditorDashboardProps) {
    const [assetId, setAssetId] = useState('');
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
    const [publicAssets, setPublicAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPublicAssets();
    }, []);

    const fetchPublicAssets = async () => {
        try {
            const data = await getAssets(currentUser.id, currentUser.role);
            setPublicAssets(data);
        } catch (err) {
            console.error("Failed to fetch public assets", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAudit = (e: React.FormEvent) => {
        e.preventDefault();
        if (assetId.trim()) {
            setSelectedAssetId(assetId.trim());
        }
    };

    return (
        <div className="container mx-auto px-4 pb-20 pt-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                        <ShieldCheck className="text-indigo-400" /> Compliance Audit Board
                    </h1>
                    <p className="text-slate-400">
                        Monitor public assets and verify transaction integrity across the network.
                    </p>
                </div>
                <div className="glass-panel p-1 rounded-xl flex">
                    <button className="px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-300 text-sm font-medium flex items-center gap-2">
                        <Activity size={16} /> Live Feed
                    </button>
                    <button className="px-4 py-2 rounded-lg text-slate-400 text-sm font-medium hover:text-white transition-colors flex items-center gap-2">
                        <ListFilter size={16} /> Filters
                    </button>
                </div>
            </div>

            {/* Search Console */}
            <div className="glass-panel p-6 rounded-2xl mb-12 border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                <form onSubmit={handleAudit} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2 ml-1">
                            Verify Specific Transaction / Asset
                        </label>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors w-5 h-5" />
                            <input
                                value={assetId}
                                onChange={(e) => setAssetId(e.target.value)}
                                type="text"
                                placeholder="Enter Asset ID or Transaction Hash..."
                                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="py-3 px-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 h-[50px]"
                    >
                        <ShieldCheck size={20} /> Verify
                    </button>
                </form>
            </div>

            {/* Public Assets Grid */}
            <div className="mb-6 flex items-center gap-3">
                <h2 className="text-xl font-bold text-white">Public Assets Ledger</h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-mono">
                    {publicAssets.length} Records
                </span>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-500">Loading ledger data...</div>
            ) : publicAssets.length === 0 ? (
                <div className="text-center py-20 text-slate-500 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">
                    No public assets found on the ledger.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {publicAssets.map((asset) => (
                        <AssetCard
                            key={asset.ID}
                            asset={asset}
                            currentUser={currentUser}
                            onTransfer={() => { }} // Disabled for Auditor
                            onShare={() => { }}    // Disabled for Auditor
                            onHistory={(a) => setSelectedAssetId(a.ID)}
                        />
                    ))}
                </div>
            )}

            {selectedAssetId && (
                <HistoryModal
                    assetId={selectedAssetId}
                    onClose={() => setSelectedAssetId(null)}
                />
            )}
        </div>
    );
}
