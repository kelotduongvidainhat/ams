import { useEffect, useState } from 'react';
import { getAssets, getPendingTransfers, getUserBalance } from '../services/api';
import type { Asset, User } from '../types';
import Navbar from '../components/Navbar';
import { useWebSocket } from '../context/WebSocketContext';
import CreateAssetModal from '../components/CreateAssetModal';
import EditAssetModal from '../components/EditAssetModal';
import TransferModal from '../components/TransferModal';
import HistoryModal from '../components/HistoryModal';
import ShareModal from '../components/ShareModal';
import PendingTransfersModal from '../components/PendingTransfersModal';
import { Loader2, AlertCircle, LayoutGrid, Globe } from 'lucide-react';

import PortfolioView from '../components/dashboard/PortfolioView';
import ExplorerView from '../components/dashboard/ExplorerView';
import MarketplaceView from '../components/dashboard/MarketplaceView';
import AdminLayout from '../components/admin/AdminLayout'; // Fixed Import
import ListAssetModal from '../components/ListAssetModal';

interface DashboardProps {
    currentUser: User;
    onLogout: () => void;
}

export default function Dashboard({ currentUser, onLogout }: DashboardProps) {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'portfolio' | 'explorer' | 'marketplace' | 'admin'>('portfolio');
    const [userBalance, setUserBalance] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const { lastMessage } = useWebSocket();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssetForTransfer, setSelectedAssetForTransfer] = useState<Asset | null>(null);
    const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<Asset | null>(null);
    const [selectedAssetForShare, setSelectedAssetForShare] = useState<Asset | null>(null);
    const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<Asset | null>(null);
    const [selectedAssetForListing, setSelectedAssetForListing] = useState<Asset | null>(null);
    const [showPendingTransfers, setShowPendingTransfers] = useState(false);

    const [marketplaceRefreshKey, setMarketplaceRefreshKey] = useState(0);

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
        fetchBalance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // WebSocket Event Listener
    useEffect(() => {
        if (lastMessage) {
            console.log("🔔 WS Event:", lastMessage.type);
            switch (lastMessage.type) {
                case 'CREATED':
                case 'UPDATED':
                case 'TRANSFERRED':
                case 'GRANT_ACCESS':
                case 'REVOKE_ACCESS':
                    fetchData(); // Refresh asset lists
                    fetchBalance(); // Balance might have changed (purchase/mint)
                    break;
                case 'LISTED':
                case 'DELISTED':
                    fetchData();
                    setMarketplaceRefreshKey(prev => prev + 1); // Refresh marketplace
                    break;
                case 'CREDITS_MINTED':
                    fetchBalance();
                    break;
                case 'TRANSFER_INITIATED':
                case 'TRANSFER_APPROVED':
                case 'TRANSFER_REJECTED':
                    fetchPendingCount(); // Refresh badge
                    if (showPendingTransfers) {
                        // Force refresh logic for modal would be here, 
                        // but standard approach is to update badge or have modal poll/listen itself
                    }
                    if (lastMessage.type === 'TRANSFER_APPROVED') {
                        fetchData(); // Ownership changed
                        setMarketplaceRefreshKey(prev => prev + 1); // Sold items removed from marketplace
                        fetchBalance(); // Balance might have changed
                    }
                    break;
            }
        }
    }, [lastMessage]);

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

    const fetchBalance = async () => {
        try {
            const data = await getUserBalance();
            setUserBalance(data.balance);
        } catch (error) {
            console.error('Failed to fetch balance:', error);
            setUserBalance(0);
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
                        <button
                            onClick={() => setActiveTab('marketplace')}
                            className={`py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'marketplace'
                                ? 'border-purple-500 text-purple-400'
                                : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                        >
                            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Marketplace
                            <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full text-xs font-semibold">{userBalance.toFixed(0)} USD</span>
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
                                onListForSale={(a) => setSelectedAssetForListing(a)} // Ensure this is wired up if not already
                            />
                        )}

                        {/* EXPLORER TAB */}
                        {activeTab === 'explorer' && (
                            <ExplorerView
                                currentUser={currentUser}
                                onHistory={(a) => setSelectedAssetForHistory(a)}
                            />
                        )}

                        {/* MARKETPLACE TAB */}
                        {activeTab === 'marketplace' && (
                            <MarketplaceView
                                currentUserId={currentUser.id}
                                userBalance={userBalance}
                                refreshTrigger={marketplaceRefreshKey}
                                onPurchaseSuccess={() => {
                                    fetchData();
                                    fetchBalance();
                                    setMarketplaceRefreshKey(prev => prev + 1);
                                }}
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

                {selectedAssetForListing && (
                    <ListAssetModal
                        asset={selectedAssetForListing}
                        onClose={() => setSelectedAssetForListing(null)}
                        onSuccess={() => {
                            setSelectedAssetForListing(null);
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
