import { useState, useEffect } from 'react';
import { Search, Globe, ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import { searchAssets } from '../services/api';

interface PublicAsset {
    id: string;
    name: string;
    type: string;
    owner: string;
    status: string;
    metadata_url: string;
    last_tx_id: string;
}

interface PublicExplorerProps {
    onBack: () => void;
}

export default function PublicExplorer({ onBack }: PublicExplorerProps) {
    const [assets, setAssets] = useState<PublicAsset[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [searchName, setSearchName] = useState('');
    const [searchOwner, setSearchOwner] = useState('');
    const [searchType, setSearchType] = useState('');

    const fetchAssets = async () => {
        setLoading(true);
        try {
            // Use shared API service to benefit from proxy configuration
            // Cast result to PublicAsset[] because Explorer endpoint returns lowercase 'id' 
            // while shared Asset type uses uppercase 'ID'
            const data = await searchAssets(searchName, searchOwner, searchType);
            setAssets(data as unknown as PublicAsset[]);
        } catch (err) {
            console.error("Failed to fetch public assets", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Initial load

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchAssets();
    };

    return (
        <div className="min-h-screen p-6 md:p-12">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2"
                    >
                        <ArrowLeft size={16} /> Back to Portal
                    </button>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Globe className="text-blue-400" /> Public Asset Explorer
                    </h1>
                    <p className="text-slate-400 mt-1">
                        View transparent real-time data from the AMS Blockchain.
                    </p>
                </div>
            </div>

            {/* Search Controls */}
            <div className="max-w-7xl mx-auto mb-8">
                <form onSubmit={handleSearch} className="glass-panel p-4 rounded-xl flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-xs text-slate-400 mb-1 ml-1">Asset Name</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name..."
                                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="w-full md:w-64">
                        <label className="block text-xs text-slate-400 mb-1 ml-1">Owner ID</label>
                        <input
                            type="text"
                            placeholder="Filter by Owner"
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-all"
                            value={searchOwner}
                            onChange={(e) => setSearchOwner(e.target.value)}
                        />
                    </div>

                    <div className="w-full md:w-48">
                        <label className="block text-xs text-slate-400 mb-1 ml-1">Asset Type</label>
                        <select
                            className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-all appearance-none"
                            value={searchType}
                            onChange={(e) => setSearchType(e.target.value)}
                        >
                            <option value="">All Types</option>
                            <option value="RealEstate">Real Estate</option>
                            <option value="Art">Art</option>
                            <option value="Vehicle">Vehicle</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full md:w-auto px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        Filter
                    </button>
                </form>
            </div>

            {/* Content Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assets.map((asset) => (
                    <div key={asset.id} className="glass-panel p-6 rounded-xl hover:bg-white/5 transition-all border border-white/5 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                            <span className={`inline-block w-2 h-2 rounded-full ${asset.status === 'Active' || asset.status === 'Available' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                        </div>

                        <div className="mb-4">
                            <span className="text-xs font-mono text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                                {asset.type}
                            </span>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-2">{asset.name}</h3>

                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Owner</span>
                                <span className="text-slate-300 font-medium">{asset.owner}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Status</span>
                                <span className="text-slate-300">{asset.status}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Asset ID</span>
                                <span className="text-slate-500 font-mono text-xs">{asset.id}</span>
                            </div>
                        </div>

                        {asset.metadata_url && (
                            <a
                                href={asset.metadata_url}
                                target="_blank"
                                rel="noreferrer"
                                className="block w-full py-2 bg-slate-800 hover:bg-slate-700 text-center rounded-lg text-sm text-slate-300 transition-colors flex items-center justify-center gap-2"
                            >
                                <ExternalLink size={14} /> View Metadata
                            </a>
                        )}
                    </div>
                ))}
            </div>

            {!loading && assets.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-slate-500 text-lg">No assets found matching your criteria.</p>
                </div>
            )}
        </div>
    );
}
