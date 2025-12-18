import { useEffect, useState } from 'react';
import { getRecentTransactions, type Transaction } from '../../services/api';
import { Clock, ArrowRight, Package, TrendingUp, Activity } from 'lucide-react';

export default function TransactionHistory() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransactions();
        // Auto-refresh every 1 hour
        const interval = setInterval(fetchTransactions, 3600000);
        return () => clearInterval(interval);
    }, []);

    const fetchTransactions = async () => {
        try {
            const data = await getRecentTransactions();
            setTransactions(data);
        } catch (err) {
            console.error('Failed to fetch transactions:', err);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        switch (action.toUpperCase()) {
            case 'CREATED':
                return 'text-green-400 bg-green-500/10';
            case 'UPDATED':
                return 'text-blue-400 bg-blue-500/10';
            case 'TRANSFERRED':
                return 'text-purple-400 bg-purple-500/10';
            case 'GRANT_ACCESS':
                return 'text-cyan-400 bg-cyan-500/10';
            case 'REVOKE_ACCESS':
                return 'text-orange-400 bg-orange-500/10';
            case 'DELETE':
                return 'text-red-400 bg-red-500/10';
            default:
                return 'text-slate-400 bg-slate-500/10';
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleString();
    };

    return (
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-emerald-400" />
                        Live Transaction Feed
                    </h2>
                    <p className="text-slate-400 text-sm">Real-time blockchain activity from the last 24 hours</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="w-4 h-4 animate-pulse text-emerald-400" />
                    <span>Auto-refreshing</span>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-3 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-slate-800/50 rounded-xl"></div>
                    ))}
                </div>
            ) : transactions.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                    <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500">No transactions in the last 24 hours</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {transactions.map((tx, index) => (
                        <div
                            key={tx.tx_id + index}
                            className="group bg-slate-800/40 backdrop-blur-sm border border-white/5 rounded-xl p-4 hover:border-emerald-500/30 transition-all hover:bg-slate-800/60"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(tx.action_type)}`}>
                                            {tx.action_type}
                                        </span>
                                        <span className="text-slate-500 text-xs font-mono">
                                            {formatTimestamp(tx.timestamp)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 mb-2">
                                        <Package className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                        <span className="text-white font-medium truncate">
                                            {tx.asset_name || tx.asset_id}
                                        </span>
                                        {tx.asset_type && (
                                            <span className="text-slate-400 text-sm">
                                                ({tx.asset_type})
                                            </span>
                                        )}
                                    </div>

                                    {tx.to_owner && (
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <ArrowRight className="w-3 h-3" />
                                            <span>Owner: {tx.to_owner}</span>
                                        </div>
                                    )}

                                    {tx.value > 0 && (
                                        <div className="flex items-center gap-2 text-sm mt-1">
                                            <TrendingUp className="w-3 h-3 text-emerald-400" />
                                            <span className="text-emerald-400 font-mono">
                                                ${tx.value.toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="text-right flex-shrink-0">
                                    <div className="text-xs text-slate-600 font-mono mb-1">TX</div>
                                    <div className="text-xs text-slate-500 font-mono max-w-[120px] truncate">
                                        {tx.tx_id.substring(0, 16)}...
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.3);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(100, 116, 139, 0.3);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(100, 116, 139, 0.5);
                }
            `}</style>
        </div>
    );
}
