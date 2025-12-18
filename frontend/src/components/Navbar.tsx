import { Share2, Plus } from 'lucide-react';

export default function Navbar() {
    return (
        <nav className="glass-panel sticky top-0 z-50 mb-8 border-b border-white/10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Share2 className="text-blue-400 w-6 h-6" />
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                            AMS Chain
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20 font-medium text-sm">
                            <Plus size={18} />
                            Create Asset
                        </button>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 border border-white/20"></div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
