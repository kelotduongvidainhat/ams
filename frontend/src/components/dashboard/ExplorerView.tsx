import { useState } from 'react';
import type { Asset, User } from '../../types';
import AssetCard from '../AssetCard';
import TransactionHistory from './TransactionHistory';
import { Search, ShieldCheck } from 'lucide-react';

interface ExplorerViewProps {
    assets: Asset[];
    currentUser: User;
    onHistory: (asset: Asset) => void;
    onSearch: (id: string) => void;
}

export default function ExplorerView({
    assets,
    currentUser,
    onHistory,
    onSearch
}: ExplorerViewProps) {
    const [searchId, setSearchId] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(searchId);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Transaction History Feed */}
            <TransactionHistory />

            {/* Search Bar */}
            <div className="glass-panel p-6 rounded-2xl mb-8 border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                <form onSubmit={handleSearch} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2 ml-1">
                            Transaction Board Search
                        </label>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors w-5 h-5" />
                            <input
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value)}
                                type="text"
                                placeholder="Enter Asset ID to verify history..."
                                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 h-[50px] shrink-0"
                    >
                        <ShieldCheck size={20} /> Verify
                    </button>
                </form>
            </div>

            <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Public Ledger</h2>
                <p className="text-slate-400 text-sm">Assets shared publicly or owned by others.</p>
            </div>

            {assets.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    No public assets found.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {assets.map((asset) => (
                        <AssetCard
                            key={asset.ID}
                            asset={asset}
                            currentUser={currentUser}
                            onTransfer={() => { }} // Disabled
                            onShare={() => { }}    // Disabled
                            onEdit={() => { }}     // Disabled
                            onHistory={onHistory}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
