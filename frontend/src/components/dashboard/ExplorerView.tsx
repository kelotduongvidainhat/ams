import { useState, useEffect } from 'react';
import type { Asset, User, PublicAsset } from '../../types';
import AssetCard from '../AssetCard';
import TransactionHistory from './TransactionHistory';
import { Search, ShieldCheck } from 'lucide-react';
import { searchAssets } from '../../services/api';

interface ExplorerViewProps {
    currentUser: User;
    onHistory: (asset: Asset) => void;
}

export default function ExplorerView({
    currentUser,
    onHistory,
}: ExplorerViewProps) {
    // Search State
    const [searchName, setSearchName] = useState('');
    const [searchOwner, setSearchOwner] = useState('');
    const [searchType, setSearchType] = useState('');

    const [assets, setAssets] = useState<PublicAsset[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const data = await searchAssets(searchName, searchOwner, searchType);
            setAssets(data as unknown as PublicAsset[]);
        } catch (err) {
            console.error("Failed to fetch public assets", err);
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

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Transaction History Feed */}
            <TransactionHistory />

            {/* Search Bar */}
            <div className="glass-panel p-6 rounded-2xl mb-8 border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2 ml-1">
                            Search by Name
                        </label>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors w-5 h-5" />
                            <input
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                type="text"
                                placeholder="Search assets..."
                                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                            />
                        </div>
                    </div>

                    <div className="w-full md:w-64">
                        <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2 ml-1">
                            Owner
                        </label>
                        <input
                            type="text"
                            placeholder="Filter by Owner"
                            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                            value={searchOwner}
                            onChange={(e) => setSearchOwner(e.target.value)}
                        />
                    </div>

                    <div className="w-full md:w-48">
                        <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2 ml-1">
                            Type
                        </label>
                        <select
                            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3 px-4 text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono appearance-none"
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
                        className="px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 h-[50px] shrink-0"
                    >
                        <ShieldCheck size={20} className={loading ? 'animate-spin' : ''} /> Filter
                    </button>
                </form>
            </div>

            <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Public Ledger</h2>
                <p className="text-slate-400 text-sm">Assets shared publicly or owned by others.</p>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-500">Loading assets...</div>
            ) : assets.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    No public assets found.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {assets.map((asset) => {
                        const adaptedAsset: Asset = {
                            ID: asset.id,
                            name: asset.name,
                            type: asset.type,
                            owner: asset.owner,
                            status: asset.status,
                            metadata_url: asset.metadata_url
                        };
                        return (
                            <AssetCard
                                key={asset.id}
                                asset={adaptedAsset}
                                currentUser={currentUser}
                                onTransfer={() => { }} // Disabled
                                onShare={() => { }}    // Disabled
                                onEdit={() => { }}     // Disabled
                                onHistory={onHistory}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
