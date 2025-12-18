import { useEffect, useState } from 'react';
import { getAssets } from '../services/api';
import type { Asset, User } from '../types';
import AssetCard from '../components/AssetCard';
import Navbar from '../components/Navbar';
import CreateAssetModal from '../components/CreateAssetModal';
import TransferModal from '../components/TransferModal';
import HistoryModal from '../components/HistoryModal';
import ShareModal from '../components/ShareModal';
import { Loader2, AlertCircle } from 'lucide-react';

interface DashboardProps {
    currentUser: User;
    onLogout: () => void;
}

export default function Dashboard({ currentUser, onLogout }: DashboardProps) {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAssetForTransfer, setSelectedAssetForTransfer] = useState<Asset | null>(null);
    const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<Asset | null>(null);
    const [selectedAssetForShare, setSelectedAssetForShare] = useState<Asset | null>(null);

    useEffect(() => {
        fetchData();
    }, [currentUser]); // Refresh when user changes

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
        <>
            <Navbar onCreateAsset={() => setIsModalOpen(true)} onLogout={onLogout} currentUser={currentUser} />
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

                {/* Modals */}
                {isModalOpen && (
                    <CreateAssetModal
                        onClose={() => setIsModalOpen(false)}
                        onSuccess={() => {
                            setIsModalOpen(false);
                            fetchData();
                        }}
                        currentUser={currentUser} // Pass currentUser to auto-fill owner field
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
