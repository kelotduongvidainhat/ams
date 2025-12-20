import type { Asset, User } from '../types';
import { ShieldCheck, User as UserIcon, Box, Tag, ExternalLink, Eye } from 'lucide-react';

interface AssetCardProps {
    asset: Asset;
    currentUser: User;
    onTransfer: (asset: Asset) => void;
    onHistory: (asset: Asset) => void;
    onShare: (asset: Asset) => void;
}

export default function AssetCard({ asset, currentUser, onTransfer, onHistory, onShare }: AssetCardProps) {
    const statusColors: Record<string, string> = {
        'Available': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        'Sold': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'Locked': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        'Owned': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };

    const statusClass = statusColors[asset.status] || 'bg-slate-700 text-slate-300';
    const isOwner = asset.owner === currentUser.id;

    return (
        <div className="glass-panel rounded-xl p-5 hover:border-blue-500/30 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-800 rounded-lg border border-slate-700 group-hover:border-blue-500/30 transition-colors">
                        <Box className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg text-white group-hover:text-blue-400 transition-colors">{asset.name}</h3>
                        <span className="text-xs text-slate-400 font-mono tracking-wide">#{asset.ID}</span>
                    </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusClass} uppercase tracking-wider`}>
                    {asset.status}
                </span>
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
                        <UserIcon size={14} /> <span>Owner</span>
                    </div>
                    <span className={`text-slate-200 ${isOwner ? 'font-bold text-blue-400' : ''}`}>
                        {asset.owner} {isOwner && '(You)'}
                    </span>
                </div>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-3">
                {asset.metadata_hash && (
                    <div className="flex items-start gap-2 p-2 rounded bg-slate-900/50 border border-white/5 text-xs text-slate-400">
                        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="break-all font-mono leading-relaxed">
                            <span className="text-emerald-500/80 mr-1">On-chain Hash:</span>
                            {asset.metadata_hash.substring(0, 16)}...{asset.metadata_hash.substring(asset.metadata_hash.length - 8)}
                        </div>
                    </div>
                )}

                {asset.metadata_url && (
                    <a href={asset.metadata_url} target="_blank" rel="noopener noreferrer"
                        className="block w-full text-center py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/5 text-sm text-blue-400 transition-colors flex items-center justify-center gap-2">
                        View Metadata <ExternalLink size={14} />
                    </a>
                )}

                <div className="grid grid-cols-3 gap-2 mt-2">
                    {currentUser.role === 'Auditor' ? (
                        <button
                            onClick={() => onHistory(asset)}
                            className="col-span-3 py-2 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-semibold uppercase tracking-wide transition-all flex items-center justify-center gap-2">
                            <ShieldCheck size={16} /> Verify & Audit History
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => onTransfer(asset)}
                                disabled={!isOwner}
                                className={`py-2 px-1 rounded-lg text-xs font-semibold uppercase tracking-wide border transition-all ${isOwner
                                    ? 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border-blue-500/20 cursor-pointer'
                                    : 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed opacity-50'
                                    }`}>
                                Transfer
                            </button>
                            <button
                                onClick={() => onShare(asset)}
                                disabled={!isOwner}
                                className={`py-2 px-1 rounded-lg text-xs font-semibold uppercase tracking-wide border transition-all flex items-center justify-center gap-1 ${isOwner
                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20 cursor-pointer'
                                    : 'bg-slate-800 text-slate-600 border-slate-700 cursor-not-allowed opacity-50'
                                    }`}>
                                <Eye size={14} /> Share
                            </button>
                            <button
                                onClick={() => onHistory(asset)}
                                className="py-2 px-1 rounded-lg bg-slate-700/50 hover:bg-slate-700/80 text-slate-300 text-xs font-semibold uppercase tracking-wide border border-slate-600/50 transition-all">
                                History
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
