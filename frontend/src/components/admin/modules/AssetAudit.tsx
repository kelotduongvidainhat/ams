import { useEffect, useState } from 'react';
import { Database, FileText, Search, RefreshCw, Lock, Unlock } from 'lucide-react';

import { searchAssets, lockAsset, unlockAsset } from '../../../services/api';
import type { Asset, PublicAsset } from '../../../types';
import HistoryModal from '../../HistoryModal';

export default function AssetAudit() {
    // Search State
    const [searchName, setSearchName] = useState('');
    const [searchOwner, setSearchOwner] = useState('');
    const [searchType, setSearchType] = useState('');

    const [assets, setAssets] = useState<PublicAsset[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const data = await searchAssets(searchName, searchOwner, searchType);
            setAssets(data as unknown as PublicAsset[]);
        } catch (err) {
            console.error("Failed to fetch assets", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchAssets();
    };

    const handleLockToggle = async (asset: PublicAsset) => {
        if (!window.confirm(`Are you sure you want to ${asset.status === 'Locked' ? 'unlock' : 'lock'} this asset?`)) return;

        // Optimistic Update
        const targetStatus = asset.status === 'Locked' ? 'Available' : 'Locked';
        setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, status: targetStatus } : a));

        try {
            let response;
            if (asset.status === 'Locked') {
                response = await unlockAsset(asset.id);
            } else {
                response = await lockAsset(asset.id);
            }
            console.log(`Asset ${asset.id} ${targetStatus === 'Locked' ? 'Locked' : 'Unlocked'} Response:`, response);

            // Wait for DB Sync before refetching source of truth
            setTimeout(fetchAssets, 2000);
        } catch (err) {
            console.error("Failed to update asset lock status", err);
            alert("Failed to update status. See console.");
            fetchAssets(); // Revert on error
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Database className="text-emerald-400" /> Asset Audit Log
            </h2>

            {/* Search Controls */}
            <div className="glass-panel p-6 rounded-xl border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2 ml-1">
                            Search by Name
                        </label>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors w-5 h-5" />
                            <input
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                type="text"
                                placeholder="Search assets..."
                                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono"
                            />
                        </div>
                    </div>

                    <div className="w-full md:w-64">
                        <label className="block text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2 ml-1">
                            Owner
                        </label>
                        <input
                            type="text"
                            placeholder="Filter by Owner"
                            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono"
                            value={searchOwner}
                            onChange={(e) => setSearchOwner(e.target.value)}
                        />
                    </div>

                    <div className="w-full md:w-48">
                        <label className="block text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2 ml-1">
                            Type
                        </label>
                        <select
                            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3 px-4 text-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-mono appearance-none"
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value="RealEstate">Real Estate</option>
                            <option value="Art">Art</option>
                            <option value="Vehicle">Vehicle</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 h-[50px] shrink-0"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} /> Filter
                    </button>
                </form>
            </div>

            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading assets...</div>
                    ) : assets.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No assets found.</div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Asset ID</th>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Owner</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {assets.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-300">{asset.id}</td>
                                        <td className="px-6 py-4 font-medium text-white">{asset.name}</td>
                                        <td className="px-6 py-4 text-slate-400">{asset.type}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-800 rounded text-xs text-blue-300 border border-slate-700">
                                                {asset.owner}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs text-slate-400">{asset.status || 'N/A'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleLockToggle(asset)}
                                                    className={`p-1.5 rounded-lg transition-colors ${asset.status === 'Locked'
                                                        ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                                                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                                        }`}
                                                    title={asset.status === 'Locked' ? "Unlock Asset" : "Lock Asset"}
                                                >
                                                    {asset.status === 'Locked' ? <Unlock size={14} /> : <Lock size={14} />}
                                                </button>
                                                <button
                                                    onClick={() => setSelectedAsset({
                                                        ID: asset.id,
                                                        name: asset.name,
                                                        type: asset.type,
                                                        owner: asset.owner,
                                                        status: asset.status,
                                                        metadata_url: asset.metadata_url || ''
                                                    })}
                                                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                                >
                                                    <FileText size={14} /> Audit
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {selectedAsset && (
                <HistoryModal
                    assetId={selectedAsset.ID}
                    onClose={() => setSelectedAsset(null)}
                />
            )}
        </div>
    );
}
