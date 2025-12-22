import { useState } from 'react';
import type { User } from '../../types';
import { ShieldCheck, BarChart3, Users, Database, ArrowRightLeft, Network, LogOut } from 'lucide-react';

import Analytics from './modules/Analytics';
import IdentityManagement from './modules/IdentityManagement';
import AssetAudit from './modules/AssetAudit';
import TransactionControl from './modules/TransactionControl';
import NetworkConfig from './modules/NetworkConfig';

interface AdminLayoutProps {
    currentUser: User;
    onLogout: () => void;
}

export default function AdminLayout({ currentUser, onLogout }: AdminLayoutProps) {
    const [activeModule, setActiveModule] = useState<string>('analytics');

    const renderModule = () => {
        switch (activeModule) {
            case 'analytics': return <Analytics />;
            case 'identity': return <IdentityManagement />;
            case 'assets': return <AssetAudit />;
            case 'transactions': return <TransactionControl />;
            case 'network': return <NetworkConfig />;
            default: return <Analytics />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex font-sans text-slate-100">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col fixed h-full z-20">
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg shadow-lg shadow-purple-900/20">
                        <ShieldCheck className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight text-white">AMS Admin</h1>
                        <p className="text-xs text-slate-500 font-mono">v2.5.0-beta</p>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    <SidebarItem
                        icon={<BarChart3 size={20} />}
                        label="Overview"
                        active={activeModule === 'analytics'}
                        onClick={() => setActiveModule('analytics')}
                    />
                    <div className="pt-4 pb-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Management</div>
                    <SidebarItem
                        icon={<Users size={20} />}
                        label="Identity & Access"
                        active={activeModule === 'identity'}
                        onClick={() => setActiveModule('identity')}
                    />
                    <SidebarItem
                        icon={<Database size={20} />}
                        label="Assets & Audit"
                        active={activeModule === 'assets'}
                        onClick={() => setActiveModule('assets')}
                    />
                    <SidebarItem
                        icon={<ArrowRightLeft size={20} />}
                        label="Transactions"
                        active={activeModule === 'transactions'}
                        onClick={() => setActiveModule('transactions')}
                    />
                    <div className="pt-4 pb-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">System</div>
                    <SidebarItem
                        icon={<Network size={20} />}
                        label="Network Health"
                        active={activeModule === 'network'}
                        onClick={() => setActiveModule('network')}
                    />
                </nav>

                <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                            {currentUser.full_name?.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium text-white truncate">{currentUser.full_name}</p>
                            <p className="text-xs text-purple-400">System Administrator</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                        <LogOut size={16} /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen bg-slate-900">
                <div className="max-w-7xl mx-auto pb-20">
                    {renderModule()}
                </div>
            </main>
        </div>
    );
}

function SidebarItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${active
                ? 'bg-blue-600 shadow-md shadow-blue-900/20 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
        >
            {icon}
            {label}
        </button>
    );
}
