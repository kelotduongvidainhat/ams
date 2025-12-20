import type { Asset, User } from '../../types';
import AssetCard from '../AssetCard';

interface PortfolioViewProps {
    assets: Asset[];
    currentUser: User;
    onTransfer: (asset: Asset) => void;
    onHistory: (asset: Asset) => void;
    onShare: (asset: Asset) => void;
    onEdit: (asset: Asset) => void;
    onCreate: () => void;
}

export default function PortfolioView({
    assets,
    currentUser,
    onTransfer,
    onHistory,
    onShare,
    onEdit,
    onCreate
}: PortfolioViewProps) {
    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">My Assets</h2>
                    <p className="text-slate-400 text-sm">Assets you currently own and control.</p>
                </div>
            </div>

            {assets.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                    <p className="text-slate-500 mb-4">You don't own any assets yet.</p>
                    <button onClick={onCreate} className="text-blue-400 hover:underline">
                        Create your first asset
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {assets.map((asset) => (
                        <AssetCard
                            key={asset.ID}
                            asset={asset}
                            currentUser={currentUser}
                            onTransfer={onTransfer}
                            onHistory={onHistory}
                            onShare={onShare}
                            onEdit={onEdit}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
