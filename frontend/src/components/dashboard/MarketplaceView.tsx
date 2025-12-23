import { useState, useEffect } from 'react';
import { searchAssets } from '../../services/api';
import type { PublicAsset } from '../../types';
import MarketplaceCard from '../MarketplaceCard';
import BuyAssetModal from '../BuyAssetModal';
import { Store, Search, Filter } from 'lucide-react';

interface MarketplaceViewProps {
    currentUserId: string;
    userBalance: number;
    onPurchaseSuccess: () => void;
    refreshTrigger?: number;
}

export default function MarketplaceView({ currentUserId, userBalance, onPurchaseSuccess, refreshTrigger }: MarketplaceViewProps) {
    const [assets, setAssets] = useState<PublicAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [showOnlyForSale, setShowOnlyForSale] = useState(true);
    const [selectedAsset, setSelectedAsset] = useState<PublicAsset | null>(null);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const data = await searchAssets(searchTerm, '', typeFilter);
            // Map Asset to PublicAsset
            const publicAssets: PublicAsset[] = data.map(asset => ({
                id: (asset as any).id || asset.ID,
                name: asset.name,
                type: (asset as any).type || asset.type,
                owner: asset.owner,
                status: asset.status,
                metadata_url: asset.metadata_url,
                last_tx_id: (asset as any).last_tx_id || asset.metadata_hash,
                price: asset.price,
                currency: asset.currency,
            }));
            setAssets(publicAssets);
        } catch (error) {
            console.error('Failed to fetch assets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, [searchTerm, typeFilter, refreshTrigger]);

    const filteredAssets = showOnlyForSale
        ? assets.filter(asset => asset.status === 'For Sale')
        : assets;

    const handleBuyClick = (asset: PublicAsset) => {
        setSelectedAsset(asset);
    };

    const handlePurchaseSuccess = () => {
        fetchAssets();
        onPurchaseSuccess();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-purple-500/30">
                    <Store className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">NFT Marketplace</h2>
                    <p className="text-slate-400 text-sm">Browse and purchase assets</p>
                </div>
            </div>

            {/* Balance Display */}
            <div className="glass-panel p-4 rounded-xl">
                <div className="flex items-center justify-between">
                    <span className="text-slate-400">Your Balance</span>
                    <span className="text-2xl font-bold text-green-400">
                        {userBalance.toFixed(2)} USD
                    </span>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="glass-panel p-4 rounded-xl space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                        >
                            <option value="">All Types</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Art">Art</option>
                            <option value="Collectible">Collectible</option>
                            <option value="Document">Document</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="forSaleOnly"
                            checked={showOnlyForSale}
                            onChange={(e) => setShowOnlyForSale(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-700 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="forSaleOnly" className="text-slate-300 text-sm cursor-pointer">
                            Show only "For Sale" items
                        </label>
                    </div>
                </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between text-sm text-slate-400">
                <span>{filteredAssets.length} assets found</span>
                {showOnlyForSale && (
                    <span className="text-emerald-400">Showing marketplace listings only</span>
                )}
            </div>

            {/* Asset Grid */}
            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <p className="mt-4 text-slate-400">Loading marketplace...</p>
                </div>
            ) : filteredAssets.length === 0 ? (
                <div className="glass-panel p-12 rounded-xl text-center">
                    <Store className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">No assets found</p>
                    <p className="text-slate-500 text-sm mt-2">
                        {showOnlyForSale ? 'No assets are currently for sale' : 'Try adjusting your search filters'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAssets.map((asset) => (
                        <MarketplaceCard
                            key={asset.id}
                            asset={asset}
                            currentUserId={currentUserId}
                            onBuy={handleBuyClick}
                        />
                    ))}
                </div>
            )}

            {/* Buy Modal */}
            {selectedAsset && (
                <BuyAssetModal
                    asset={selectedAsset}
                    userBalance={userBalance}
                    onClose={() => setSelectedAsset(null)}
                    onSuccess={handlePurchaseSuccess}
                />
            )}
        </div>
    );
}
