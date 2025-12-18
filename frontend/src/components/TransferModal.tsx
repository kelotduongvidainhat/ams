import { useState } from 'react';
import { transferAsset } from '../services/api';
import { X, RefreshCw, UserCheck, Loader2 } from 'lucide-react';

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
            await transferAsset(assetId, newOwner);
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Transfer failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <RefreshCw className="text-blue-400" /> Transfer Asset
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-xs text-blue-300 uppercase font-bold mb-1">Asset ID</p>
                        <p className="text-white font-mono mb-3">{assetId}</p>
                        <p className="text-xs text-blue-300 uppercase font-bold mb-1">Current Owner</p>
                        <p className="text-white">{currentOwner}</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">New Owner ID</label>
                            <div className="relative">
                                <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    value={newOwner} onChange={(e) => setNewOwner(e.target.value)}
                                    type="text" required placeholder="e.g. user02"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Confirm Transfer'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
