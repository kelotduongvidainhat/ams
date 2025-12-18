import { useEffect, useState } from 'react';
import { getAssets } from '../services/api';
import type { Asset, User } from '../types';
import AssetCard from '../components/AssetCard';
import Navbar from '../components/Navbar';
import CreateAssetModal from '../components/CreateAssetModal';
import TransferModal from '../components/TransferModal';
import HistoryModal from '../components/HistoryModal';
import ShareModal from '../components/ShareModal';
import { Loader2, AlertCircle, LayoutGrid, Globe, ShieldCheck, Search } from 'lucide-react';

interface DashboardProps {
    currentUser: User;
    onLogout: () => void;
}

export default function Dashboard({ currentUser, onLogout }: DashboardProps) {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'portfolio' | 'explorer'>('portfolio');
    const [searchId, setSearchId] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssetForTransfer, setSelectedAssetForTransfer] = useState<Asset | null>(null);
    const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<Asset | null>(null);
    const [selectedAssetForShare, setSelectedAssetForShare] = useState<Asset | null>(null);

    // Initial Tab Selection based on Role
    useEffect(() => {
        if (currentUser.role === 'Auditor') {
            setActiveTab('explorer');
        }
    }, [currentUser.role]);

    useEffect(() => {
        fetchData();
    }, [currentUser]);

    const fetchData = async () => {
        try {
            const data = await getAssets(currentUser.id, currentUser.role);
            setAssets(data);
        } catch (err) {
            setError('Failed to fetch assets from Blockchain.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchId.trim()) {
            // Open History Modal for the searched ID (even if not in list)
            setSelectedAssetForHistory({ ID: searchId.trim() } as Asset);
        }
    };

    // Filter Assets
    const myAssets = assets.filter(a => a.owner === currentUser.id);
    const publicAssets = assets.filter(a => a.owner !== currentUser.id);

    return (
        <>
            <Navbar onCreateAsset={() => setIsModalOpen(true)} onLogout={onLogout} currentUser={currentUser} />

            {/* Sub-Navigation Tabs */}
            <div className="border-b border-white/5 bg-slate-900/50 backdrop-blur-sm sticky top-16 z-30">
                <div className="container mx-auto px-4">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setActiveTab('portfolio')}
                            className={`py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'portfolio'
                                    ? 'border-blue-500 text-blue-400'
                                    : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                        >
                            <LayoutGrid size={18} /> My Portfolio
                            <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-xs">{myAssets.length}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('explorer')}
                            className={`py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'explorer'
                                    ? 'border-indigo-500 text-indigo-400'
                                    : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                        >
                            <Globe size={18} /> Public Explorer
                            <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full text-xs">{publicAssets.length}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 pb-20">
                {/* Error State */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-8 flex items-center gap-3 text-red-400">
                        <AlertCircle size={20} /> {error}
                    </div>
                )}

                {/* Loading State */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                        <p>Syncing with Blockchain...</p>
                    </div>
                ) : (
                    <>
                        {/* PORTFOLIO TAB */}
                        {activeTab === 'portfolio' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-between items-end mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">My Assets</h2>
                                        <p className="text-slate-400 text-sm">Assets you currently own and control.</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-slate-400 mb-1">Total Valuation</div>
                                        <div className="text-2xl font-bold text-emerald-400">
                                            ${myAssets.reduce((sum, a) => sum + a.value, 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {myAssets.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                                        <p className="text-slate-500 mb-4">You don't own any assets yet.</p>
                                        <button onClick={() => setIsModalOpen(true)} className="text-blue-400 hover:underline">
                                            Create your first asset
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {myAssets.map((asset) => (
                                            <AssetCard
                                                key={asset.ID}
                                                asset={asset}
                                                currentUser={currentUser}
                                                onTransfer={(a) => setSelectedAssetForTransfer(a)}
                                                onHistory={(a) => setSelectedAssetForHistory(a)}
                                                onShare={(a) => setSelectedAssetForShare(a)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* EXPLORER TAB */}
                        {activeTab === 'explorer' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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

                                {publicAssets.length === 0 ? (
                                    <div className="text-center py-20 text-slate-500">
                                        No public assets found.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {publicAssets.map((asset) => (
                                            <AssetCard
                                                key={asset.ID}
                                                asset={asset}
                                                currentUser={currentUser}
                                                onTransfer={() => { }} // Disabled
                                                onShare={() => { }}    // Disabled
                                                onHistory={(a) => setSelectedAssetForHistory(a)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Modals */}
                {isModalOpen && (
                    <CreateAssetModal
                        onClose={() => setIsModalOpen(false)}
                        onSuccess={() => {
                            setIsModalOpen(false);
                            fetchData();
                        }}
                        currentUser={currentUser}
                    />
                )}

                {selectedAssetForTransfer && (
                    <TransferModal
                        assetId={selectedAssetForTransfer.ID}
                        currentOwner={selectedAssetForTransfer.owner}
                        onClose={() => setSelectedAssetForTransfer(null)}
                        onSuccess={() => fetchData()}
                    />
                )}

                {selectedAssetForHistory && (
                    <HistoryModal
                        assetId={selectedAssetForHistory.ID}
                        onClose={() => setSelectedAssetForHistory(null)}
                    />
                )}

                {selectedAssetForShare && (
                    <ShareModal
                        assetId={selectedAssetForShare.ID}
                        onClose={() => setSelectedAssetForShare(null)}
                        onSuccess={() => fetchData()}
                    />
                )}
            </div>
        </>
    );
}
