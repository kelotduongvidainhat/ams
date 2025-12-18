import { useEffect, useState } from 'react';
import { getAssetHistory } from '../services/api';
import type { AssetHistory } from '../types';
import { X, History, Loader2, ArrowRight } from 'lucide-react';

interface HistoryModalProps {
    assetId: string;
    onClose: () => void;
}

export default function HistoryModal({ assetId, onClose }: HistoryModalProps) {
    const [history, setHistory] = useState<AssetHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await getAssetHistory(assetId);
                setHistory(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [assetId]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <History className="text-blue-400" /> Asset Provenance
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" /></div>
                    ) : (
                        <div className="relative border-l-2 border-slate-700 ml-3 space-y-8">
                            {history.map((record, index) => (
                                <div key={record.txId} className="relative pl-8">
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-blue-500 box-content"></div>
                                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 hover:bg-slate-800 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
                                                TX: {record.txId.substring(0, 12)}...
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {new Date(record.timestamp).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-white">
                                            <div className="flex flex-col">
                                                <span className="text-slate-400 text-xs uppercase">Action</span>
                                                <span className="font-semibold text-blue-400">
                                                    {index === history.length - 1 ? 'Asset Created' : 'Transfer / Update'}
                                                </span>
                                            </div>
                                            <ArrowRight className="text-slate-600 mx-2" size={16} />
                                            <div className="flex flex-col">
                                                <span className="text-slate-400 text-xs uppercase">Owner</span>
                                                <span>{record.record.owner}</span>
                                            </div>
                                            <div className="w-px h-8 bg-slate-700 mx-2"></div>
                                            <div className="flex flex-col">
                                                <span className="text-slate-400 text-xs uppercase">Value</span>
                                                <span>${record.record.value.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
