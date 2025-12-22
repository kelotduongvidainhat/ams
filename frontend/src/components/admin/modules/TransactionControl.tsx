import { useEffect, useState } from 'react';
import { ArrowRightLeft, Clock } from 'lucide-react';

import { getPendingTransfers } from '../../../services/api';
import type { PendingTransfer } from '../../../types';

export default function TransactionControl() {
    const [transfers, setTransfers] = useState<PendingTransfer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getPendingTransfers()
            .then(setTransfers)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading transactions...</div>;

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
                                    <th className="px-6 py-4">Transfer ID</th>
                                    <th className="px-6 py-4">Asset</th>
                                    <th className="px-6 py-4">From</th>
                                    <th className="px-6 py-4">To</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Created At</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {transfers.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-slate-500">#{tx.id}</td>
                                        <td className="px-6 py-4 font-medium text-white">{tx.asset_id}</td>
                                        <td className="px-6 py-4 text-red-300">{tx.current_owner}</td>
                                        <td className="px-6 py-4 text-green-300">{tx.new_owner}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-medium flex items-center w-fit gap-1">
                                                <Clock size={10} /> Pending
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">
                                            {new Date(tx.created_at).toLocaleString()}
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
