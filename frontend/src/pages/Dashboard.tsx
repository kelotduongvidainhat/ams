import { useEffect, useState } from 'react';
import { getAssets, getPendingTransfers } from '../services/api';
import type { Asset, User } from '../types';
import Navbar from '../components/Navbar';
import CreateAssetModal from '../components/CreateAssetModal';
import EditAssetModal from '../components/EditAssetModal';
import TransferModal from '../components/TransferModal';
import HistoryModal from '../components/HistoryModal';
import ShareModal from '../components/ShareModal';
import PendingTransfersModal from '../components/PendingTransfersModal';
import { Loader2, AlertCircle, LayoutGrid, Globe } from 'lucide-react';

import PortfolioView from '../components/dashboard/PortfolioView';
import ExplorerView from '../components/dashboard/ExplorerView';
import AdminLayout from '../components/admin/AdminLayout'; // Fixed Import

interface DashboardProps {
    currentUser: User;
    onLogout: () => void;
}

export default function Dashboard({ currentUser, onLogout }: DashboardProps) {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'portfolio' | 'explorer' | 'admin'>('portfolio');
    const [pendingCount, setPendingCount] = useState(0);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssetForTransfer, setSelectedAssetForTransfer] = useState<Asset | null>(null);
    const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<Asset | null>(null);
    const [selectedAssetForShare, setSelectedAssetForShare] = useState<Asset | null>(null);
    const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<Asset | null>(null);
    const [showPendingTransfers, setShowPendingTransfers] = useState(false);

    // Initial Tab Selection based on Role
    useEffect(() => {
        if (currentUser.role === 'Auditor') {
            setActiveTab('explorer');
        } else if (currentUser.role === 'Admin') {
            setActiveTab('admin');
        }
    }, [currentUser.role]);

    useEffect(() => {
        fetchData();
        fetchPendingCount();
        // Poll for pending transfers every 30 seconds
        const interval = setInterval(fetchPendingCount, 30000);
        return () => clearInterval(interval);
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

    const fetchPendingCount = async () => {
        try {
            const pending = await getPendingTransfers();
            setPendingCount(pending.length);
        } catch (err) {
            console.error('Failed to fetch pending transfers:', err);
        }
    };

    const handleSearch = (id: string) => {
        if (id.trim()) {
            // Open History Modal for the searched ID (even if not in list)
            setSelectedAssetForHistory({ ID: id.trim() } as Asset);
        }
    };

    // Filter Assets
    const myAssets = assets.filter(a => a.owner === currentUser.id);
    const publicAssets = assets.filter(a => a.owner !== currentUser.id);

    if (currentUser.role === 'Admin') {
        return <AdminLayout currentUser={currentUser} onLogout={onLogout} />;
    }

    return (
        <>
            <Navbar
                onCreateAsset={() => setIsModalOpen(true)}
                onLogout={onLogout}
                onViewPendingTransfers={() => setShowPendingTransfers(true)}
                pendingCount={pendingCount}
                currentUser={currentUser}
            />

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
                            <PortfolioView
                                assets={myAssets}
                                currentUser={currentUser}
                                onTransfer={(a) => setSelectedAssetForTransfer(a)}
                                onHistory={(a) => setSelectedAssetForHistory(a)}
                                onShare={(a) => setSelectedAssetForShare(a)}
                                onEdit={(a) => setSelectedAssetForEdit(a)}
                                onCreate={() => setIsModalOpen(true)}
                            />
                        )}

                        {/* EXPLORER TAB */}
                        {activeTab === 'explorer' && (
                            <ExplorerView
                                assets={publicAssets}
                                currentUser={currentUser}
                                onHistory={(a) => setSelectedAssetForHistory(a)}
                                onSearch={handleSearch}
                            />
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

                {selectedAssetForEdit && (
                    <EditAssetModal
                        asset={selectedAssetForEdit}
                        onClose={() => setSelectedAssetForEdit(null)}
                        onSuccess={() => {
                            setSelectedAssetForEdit(null);
                            fetchData();
                        }}
                    />
                )}

                {showPendingTransfers && (
                    <PendingTransfersModal
                        onClose={() => setShowPendingTransfers(false)}
                        onSuccess={() => {
                            fetchData();
                            fetchPendingCount();
                        }}
                    />
                )}
            </div>
        </>
    );
}
