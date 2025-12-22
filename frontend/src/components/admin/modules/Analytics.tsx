import { useEffect, useState } from 'react';
import { Users, Database, ArrowRightLeft } from 'lucide-react';
import { getDashboardStats } from '../../../services/api';
import type { DashboardStats } from '../../../types';

export default function Analytics() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDashboardStats()
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">System Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 rounded-xl relative overflow-hidden group hover:bg-slate-800/60 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users size={64} />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <Users size={20} />
                        </div>
                        <span className="text-slate-400 font-medium">Total Users</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{stats?.total_users || 0}</div>
                    <div className="text-xs text-slate-500">Registered Accounts</div>
                </div>

                <div className="glass-panel p-6 rounded-xl relative overflow-hidden group hover:bg-slate-800/60 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Database size={64} />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                            <Database size={20} />
                        </div>
                        <span className="text-slate-400 font-medium">Total Assets</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{stats?.total_assets || 0}</div>
                    <div className="text-xs text-slate-500">Active on Blockchain</div>
                </div>

                <div className="glass-panel p-6 rounded-xl relative overflow-hidden group hover:bg-slate-800/60 transition-colors">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ArrowRightLeft size={64} />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                            <ArrowRightLeft size={20} />
                        </div>
                        <span className="text-slate-400 font-medium">Pending Transfers</span>
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{stats?.pending_transfers || 0}</div>
                    <div className="text-xs text-slate-500">Awaiting Approval</div>
                </div>
            </div>
        </div>
    );
}
