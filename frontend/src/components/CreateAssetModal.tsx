import { useState } from 'react';
import { createAsset } from '../services/api';
import { X, Save, Loader2, Tag, DollarSign, Box, Link } from 'lucide-react';

interface CreateAssetModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateAssetModal({ onClose, onSuccess }: CreateAssetModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        type: 'Electronics',
        owner: '',
        value: 0,
        status: 'Available',
        metadata_url: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createAsset({
                ID: formData.id,
                name: formData.name,
                type: formData.type,
                owner: formData.owner,
                value: Number(formData.value),
                status: formData.status,
                metadata_url: formData.metadata_url
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            alert('Failed to create asset');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="glass-panel w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Box className="text-blue-400" /> Register New Asset
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Asset ID</label>
                            <input
                                name="id" value={formData.id} onChange={handleChange}
                                type="text" required placeholder="e.g. asset99"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Type</label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                <select
                                    name="type" value={formData.type} onChange={handleChange}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                                >
                                    <option value="Electronics">Electronics</option>
                                    <option value="RealEstate">Real Estate</option>
                                    <option value="Vehicle">Vehicle</option>
                                    <option value="Art">Art</option>
                                    <option value="PreciousMetal">Precious Metal</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Asset Name</label>
                        <input
                            name="name" value={formData.name} onChange={handleChange}
                            type="text" required placeholder="e.g. Solar Farm Beta"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Owner</label>
                            <input
                                name="owner" value={formData.owner} onChange={handleChange}
                                type="text" required placeholder="Owner Name"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Value ($)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                <input
                                    name="value" value={formData.value} onChange={handleChange}
                                    type="number" required placeholder="0"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Metadata URL (Off-chain)</label>
                        <div className="relative">
                            <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                            <input
                                name="metadata_url" value={formData.metadata_url} onChange={handleChange}
                                type="url" required placeholder="https://ipfs.io/ipfs/..."
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1 ml-1">Link to external JSON/PDF. Will be hashed On-chain.</p>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                            Register Asset
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
