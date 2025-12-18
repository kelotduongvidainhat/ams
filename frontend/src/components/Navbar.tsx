import { Share2, Plus, LogOut } from 'lucide-react';
import type { User } from '../types';

interface NavbarProps {
    onCreateAsset: () => void;
    onLogout: () => void;
    currentUser: User;
}

export default function Navbar({ onCreateAsset, onLogout, currentUser }: NavbarProps) {
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
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-sm text-white font-medium">{currentUser.full_name}</span>
                            <span className="text-xs text-slate-400 font-mono tracking-wider">{currentUser.id}</span>
                        </div>
                        <button
                            onClick={onCreateAsset}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-500/20 font-medium text-sm">
                            <Plus size={18} />
                            <span className="hidden sm:inline">Create Asset</span>
                        </button>
                        <button
                            onClick={onLogout}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
