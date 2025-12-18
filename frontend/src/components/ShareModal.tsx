import { useState } from 'react';
import { grantAccess } from '../services/api';
import { X, Eye, Users, Loader2, Globe } from 'lucide-react';

interface ShareModalProps {
    assetId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ShareModal({ assetId, onClose, onSuccess }: ShareModalProps) {
    const [viewerId, setViewerId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await grantAccess(assetId, viewerId);
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to grant access');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Eye className="text-blue-400" /> Share Access
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-slate-400 text-sm mb-4">
                        Grant view permission to another user. They will see this asset in their dashboard.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Viewer ID</label>
                            <div className="relative">
                                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    value={viewerId} onChange={(e) => setViewerId(e.target.value)}
                                    type="text" required placeholder="User ID or 'EVERYONE'"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-2 ml-1 flex items-center gap-1">
                                <Globe size={12} /> Type <b>EVERYONE</b> for public access.
                            </p>
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Grant Permission'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
