import { useEffect, useState } from 'react';
import { ArrowRightLeft, Clock, CheckCircle2 } from 'lucide-react';

import { getAllPendingTransfers } from '../../../services/api';
import type { PendingTransfer } from '../../../types';

export default function TransactionControl() {
    const [transfers, setTransfers] = useState<PendingTransfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log("Fetching admin pending transfers...");
        getAllPendingTransfers()
            .then(data => {
                console.log("Admin transfers received:", data);
                if (Array.isArray(data)) {
                    setTransfers(data);
                } else {
                    console.error("Expected array, got:", data);
                    setTransfers([]);
                }
            })
            .catch(err => {
                console.error("Failed to fetch admin transfers:", err);
                setError("Failed to load transactions.");
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading transactions...</div>;
    if (error) return <div className="p-8 text-center text-red-400">{error}</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="text-amber-400" /> Transaction Control
            </h2>

            <div className="glass-panel rounded-xl overflow-hidden">
                {transfers.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                        No pending transactions found.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Asset</th>
                                    <th className="px-6 py-4">Structure</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Created At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {transfers.map((tx) => (
                                    <tr key={tx.asset_id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{tx.asset_name || tx.asset_id}</div>
                                            <div className="text-xs text-slate-500 font-mono">{tx.asset_id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="text-slate-400">From:</span>
                                                <span className={`px-2 py-0.5 rounded ${tx.approvals?.some(a => a.signer === tx.current_owner) ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                                    {tx.current_owner}
                                                </span>
                                                <ArrowRightLeft size={12} className="text-slate-600" />
                                                <span className="text-slate-400">To:</span>
                                                <span className={`px-2 py-0.5 rounded ${tx.approvals?.some(a => a.signer === tx.new_owner) ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                                    {tx.new_owner}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex gap-1">
                                                {(tx.approvals || []).map(app => (
                                                    <div key={app.signer} title={`Signed by ${app.signer}`} className="w-4 h-4 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                                                        <CheckCircle2 size={10} />
                                                    </div>
                                                ))}
                                                {Array.from({ length: Math.max(0, 2 - (tx.approvals?.length || 0)) }).map((_, i) => (
                                                    <div key={i} className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700"></div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit gap-1 ${tx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                    tx.status === 'EXECUTED' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                        tx.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                            'bg-slate-700 text-slate-300'
                                                }`}>
                                                <Clock size={10} /> {tx.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">
                                            {/* Handle both seconds (chaincode) and string dates if mixed */}
                                            {typeof tx.created_at === 'number'
                                                ? new Date(tx.created_at * 1000).toLocaleString()
                                                : tx.created_at}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
