import { useEffect, useState } from 'react';
import { Database, FileText } from 'lucide-react';

import { getAssets } from '../../../services/api'; // We can reuse the main getAssets or create specific admin endpoint
import type { Asset } from '../../../types';
import HistoryModal from '../../HistoryModal';

export default function AssetAudit() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    useEffect(() => {
        // Admin fetches all assets
        getAssets('admin', 'Admin')
            .then(setAssets)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading assets...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Database className="text-emerald-400" /> Asset Audit Log
            </h2>

            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Asset ID</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Owner</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">History</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {assets.map((asset) => (
                                <tr key={asset.ID} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 font-mono text-slate-300">{asset.ID}</td>
                                    <td className="px-6 py-4 font-medium text-white">{asset.name}</td>
                                    <td className="px-6 py-4 text-slate-400">{asset.type}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-slate-800 rounded text-xs text-blue-300 border border-slate-700">
                                            {asset.owner}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs text-slate-400">{asset.status || 'N/A'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setSelectedAsset(asset)}
                                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1 ml-auto"
                                        >
                                            <FileText size={14} /> Audit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedAsset && (
                <HistoryModal
                    assetId={selectedAsset.ID}
                    onClose={() => setSelectedAsset(null)}
                />
            )}
        </div>
    );
}
