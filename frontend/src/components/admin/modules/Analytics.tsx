import { useEffect, useState } from 'react';
import { Users, Database, ArrowRightLeft, TrendingUp, PieChart } from 'lucide-react';
import { getDashboardStats, getAnalyticsData } from '../../../services/api';
import type { DashboardStats } from '../../../types';

interface AnalyticsData {
    transaction_volume: { date: string; count: number }[];
    asset_distribution: { type: string; count: number }[];
}

export default function Analytics() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            getDashboardStats(),
            getAnalyticsData()
        ])
            .then(([statsData, analyticsData]) => {
                setStats(statsData);
                setAnalytics(analyticsData);
            })
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
        <div className="space-y-8">
            <h2 className="text-xl font-bold text-white">System Overview</h2>

            {/* KPI Cards */}
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

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Transaction Volume Chart */}
                <div className="glass-panel p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-400" /> Transaction Volume (7 Days)
                    </h3>
                    <div className="h-64 flex items-end justify-between gap-2 px-2">
                        {analytics?.transaction_volume.map((item, index) => {
                            const max = Math.max(...analytics.transaction_volume.map(v => v.count), 1);
                            const heightPercentage = (item.count / max) * 100;
                            return (
                                <div key={index} className="flex flex-col items-center gap-2 flex-1 group">
                                    <div
                                        className="w-full bg-blue-500/30 hover:bg-blue-500/60 rounded-t-sm transition-all relative group-hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                        style={{ height: `${heightPercentage}%`, minHeight: '4px' }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700 pointer-events-none">
                                            {item.count} Txns
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500 rotate-45 origin-left translate-y-2 whitespace-nowrap">{item.date.slice(5)}</div>
                                </div>
                            );
                        })}
                        {(!analytics?.transaction_volume || analytics.transaction_volume.length === 0) && (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 italic">
                                No transaction data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Asset Distribution Chart */}
                <div className="glass-panel p-6 rounded-xl">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                        <PieChart size={20} className="text-emerald-400" /> Asset Distribution
                    </h3>
                    <div className="space-y-4">
                        {analytics?.asset_distribution.map((item, index) => {
                            const total = analytics.asset_distribution.reduce((acc, curr) => acc + curr.count, 0) || 1;
                            const percentage = Math.round((item.count / total) * 100);
                            return (
                                <div key={index} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-300">{item.type}</span>
                                        <span className="text-slate-400">{item.count} ({percentage}%)</span>
                                    </div>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500/50 rounded-full"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                        {(!analytics?.asset_distribution || analytics.asset_distribution.length === 0) && (
                            <div className="w-full h-32 flex items-center justify-center text-slate-500 italic">
                                No asset data available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
