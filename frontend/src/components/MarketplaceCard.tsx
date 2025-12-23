import type { PublicAsset } from '../types';
import { ShoppingCart, Tag, User as UserIcon, DollarSign } from 'lucide-react';

interface MarketplaceCardProps {
    asset: PublicAsset;
    currentUserId?: string;
    onBuy: (asset: PublicAsset) => void;
}

export default function MarketplaceCard({ asset, currentUserId, onBuy }: MarketplaceCardProps) {
    const isForSale = asset.status === 'For Sale';
    const isOwner = asset.owner === currentUserId;
    const price = asset.price || 0;
    const currency = asset.currency || 'USD';

    return (
        <div className="glass-panel rounded-xl p-5 hover:border-blue-500/30 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-semibold text-lg text-white group-hover:text-blue-400 transition-colors">
                        {asset.name}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">#{asset.id}</span>
                </div>
                {isForSale && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-wider">
                        For Sale
                    </span>
                )}
            </div>

            <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                        <Tag size={14} /> <span>Type</span>
                    </div>
                    <span className="text-slate-200">{asset.type}</span>
                </div>

                <div className="flex items-center justify-between text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                        <UserIcon size={14} /> <span>Seller</span>
                    </div>
                    <span className={`text-slate-200 ${isOwner ? 'font-bold text-blue-400' : ''}`}>
                        {asset.owner} {isOwner && '(You)'}
                    </span>
                </div>

                {isForSale && (
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                            <DollarSign size={16} className="text-blue-400" />
                            <span>Price</span>
                        </div>
                        <span className="text-xl font-bold text-blue-400">
                            {price.toFixed(2)} {currency}
                        </span>
                    </div>
                )}
            </div>

            {isForSale && !isOwner && (
                <button
                    onClick={() => onBuy(asset)}
                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20"
                >
                    <ShoppingCart size={18} />
                    Buy Now
                </button>
            )}

            {isForSale && isOwner && (
                <div className="w-full py-3 px-4 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-center text-sm">
                    This is your listing
                </div>
            )}

            {!isForSale && (
                <div className="w-full py-3 px-4 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 text-center text-sm">
                    Not for sale
                </div>
            )}
        </div>
    );
}
