import { Share2, Plus, LogOut, Bell } from 'lucide-react';
import type { User } from '../types';

interface NavbarProps {
    onCreateAsset: () => void;
    onLogout: () => void;
    onViewPendingTransfers: () => void;
    pendingCount: number;
    currentUser: User;
    onEditProfile: () => void;
}

export default function Navbar({ onCreateAsset, onLogout, onViewPendingTransfers, pendingCount, currentUser, onEditProfile }: NavbarProps) {
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
                        <button
                            onClick={onEditProfile}
                            className="hidden md:flex flex-col items-end mr-2 hover:bg-white/5 p-1 rounded-md transition-colors text-right"
                            title="Edit Profile"
                        >
                            <span className="text-sm text-white font-medium">{currentUser.full_name}</span>
                            <span className="text-xs text-slate-400 font-mono tracking-wider">{currentUser.id}</span>
                        </button>

                        {/* Pending Transfers Notification */}
                        <button
                            onClick={onViewPendingTransfers}
                            className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                            title="Pending Transfers"
                        >
                            <Bell size={20} />
                            {pendingCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                                    {pendingCount}
                                </span>
                            )}
                        </button>

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
