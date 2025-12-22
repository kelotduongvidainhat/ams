import { useState } from 'react';
import { initiateTransfer } from '../services/api';
import { X, RefreshCw, UserCheck, Loader2, Clock, CheckCircle2 } from 'lucide-react';

interface TransferModalProps {
    assetId: string;
    currentOwner: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function TransferModal({ assetId, currentOwner, onClose, onSuccess }: TransferModalProps) {
    const [newOwner, setNewOwner] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await initiateTransfer(assetId, newOwner);
            alert(`Transfer initiated! Pending ID: ${result.pending_id}\n\nThe recipient (${newOwner}) must approve within 24 hours.`);
            onSuccess();
            onClose();
        } catch (error: unknown) {
            console.error(error);
            const err = error as { response?: { data?: { error?: string } } };
            alert(err.response?.data?.error || 'Transfer initiation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <RefreshCw className="text-blue-400" /> Initiate Transfer
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Multi-Sig Info Banner */}
                    <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-amber-300 mb-1">Multi-Signature Required</p>
                                <p className="text-xs text-amber-200/80">
                                    This transfer requires approval from both parties. The recipient has 24 hours to accept or reject.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg space-y-3">
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Asset ID</p>
                            <p className="text-white font-mono">{assetId}</p>
                        </div>
                        <div className="h-px bg-slate-700/50"></div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Current Owner</p>
                            <p className="text-white flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                {currentOwner} <span className="text-xs text-slate-500">(You - Auto-approved)</span>
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">New Owner ID</label>
                            <div className="relative">
                                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    value={newOwner} onChange={(e) => setNewOwner(e.target.value)}
                                    type="text" required placeholder="e.g. Brad"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1.5 ml-1">
                                ⏱️ Recipient must approve within 24 hours
                            </p>
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Initiate Transfer (1/2)'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
