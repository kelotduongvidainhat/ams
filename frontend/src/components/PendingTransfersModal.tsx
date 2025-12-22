import { useState, useEffect } from 'react';
import { getPendingTransfers, approveTransfer, rejectTransfer } from '../services/api';
import { X, Clock, CheckCircle2, XCircle, Package, User, ArrowRight, Loader2 } from 'lucide-react';

interface PendingTransfer {
    asset_id: string;
    asset_name: string;
    current_owner: string;
    new_owner: string;
    status: string;
    created_at: number; // Unix timestamp from blockchain
    expires_at: number; // Unix timestamp from blockchain
    approval_count: number;
    has_signed: boolean;
    is_recipient: boolean;
}

interface PendingTransfersModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function PendingTransfersModal({ onClose, onSuccess }: PendingTransfersModalProps) {
    const [transfers, setTransfers] = useState<PendingTransfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchPendingTransfers();
    }, []);

    const fetchPendingTransfers = async () => {
        try {
            const data = await getPendingTransfers();
            setTransfers(data);
        } catch (error) {
            console.error('Failed to fetch pending transfers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (assetId: string) => {
        setActionLoading(assetId);
        try {
            const result = await approveTransfer(assetId);
            alert(result.message);
            onSuccess();
            fetchPendingTransfers();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            alert(err.response?.data?.error || 'Approval failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (assetId: string) => {
        const reason = prompt('Reason for rejection (optional):');
        if (reason === null) return; // User cancelled

        setActionLoading(assetId);
        try {
            const result = await rejectTransfer(assetId, reason || 'No reason provided');
            alert(result.message);
            onSuccess();
            fetchPendingTransfers();
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } };
            alert(err.response?.data?.error || 'Rejection failed');
        } finally {
            setActionLoading(null);
        }
    };

    const getTimeRemaining = (expiresAtUnix: number) => {
        const now = Date.now();
        const expiry = expiresAtUnix * 1000; // Convert Unix timestamp to milliseconds
        const diff = expiry - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours < 0) return 'Expired';
        if (hours < 1) return `${minutes}m remaining`;
        return `${hours}h ${minutes}m remaining`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Clock className="text-amber-400" /> Pending Transfers
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-4">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                            <p>Loading pending transfers...</p>
                        </div>
                    ) : transfers.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">
                            <Clock className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                            <p className="text-lg font-medium mb-2">No Pending Transfers</p>
                            <p className="text-sm">You have no transfers awaiting approval.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {transfers.map((transfer) => (
                                <div
                                    key={transfer.asset_id}
                                    className="glass-panel p-5 rounded-xl border border-white/10 hover:border-amber-500/30 transition-all"
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <Package className="w-5 h-5 text-blue-400" />
                                            <div>
                                                <h3 className="font-semibold text-white">{transfer.asset_name}</h3>
                                                <p className="text-xs text-slate-400 font-mono">{transfer.asset_id}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {getTimeRemaining(transfer.expires_at)}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {transfer.approval_count}/2 signatures
                                            </div>
                                        </div>
                                    </div>

                                    {/* Transfer Flow */}
                                    <div className="flex items-center gap-3 mb-4 p-3 bg-slate-900/50 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm text-white">{transfer.current_owner}</span>
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-600" />
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm text-white">{transfer.new_owner}</span>
                                            {transfer.has_signed ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                            ) : (
                                                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {!transfer.has_signed && transfer.is_recipient && (
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => handleApprove(transfer.asset_id)}
                                                disabled={actionLoading === transfer.asset_id}
                                                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {actionLoading === transfer.asset_id ? (
                                                    <Loader2 className="animate-spin w-4 h-4" />
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Approve Transfer
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleReject(transfer.asset_id)}
                                                disabled={actionLoading === transfer.asset_id}
                                                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {actionLoading === transfer.asset_id ? (
                                                    <Loader2 className="animate-spin w-4 h-4" />
                                                ) : (
                                                    <>
                                                        <XCircle className="w-4 h-4" />
                                                        Reject
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {transfer.has_signed && !transfer.is_recipient && (
                                        <div className="text-center py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                            <p className="text-sm text-blue-300">
                                                ✓ You initiated this transfer. Awaiting recipient approval.
                                            </p>
                                        </div>
                                    )}

                                    {transfer.has_signed && transfer.is_recipient && (
                                        <div className="text-center py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                                            <p className="text-sm text-green-300">
                                                ✓ You have approved this transfer.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
