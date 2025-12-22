import { useEffect, useState } from 'react';
import { Users, Database, ArrowRightLeft, ShieldCheck, Wallet, User as UserIcon } from 'lucide-react';
import { getDashboardStats, getAllUsers } from '../../services/api';
import type { DashboardStats, UserStats, User } from '../../types';

interface AdminViewProps {
    currentUser: User;
}

export default function AdminView({ currentUser }: AdminViewProps) {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [users, setUsers] = useState<UserStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const [statsData, usersData] = await Promise.all([
                    getDashboardStats(),
                    getAllUsers()
                ]);
                setStats(statsData);
                setUsers(usersData);
            } catch (error) {
                console.error("Failed to fetch admin data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
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
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-300 bg-clip-text text-transparent">
                        System Administration
                    </h2>
                    <p className="text-slate-400 mt-1">
                        Welcome, {currentUser.full_name}. Overview of system metrics.
                    </p>
                </div>
                <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-2 text-sm text-purple-300">
                    <ShieldCheck size={16} />
                    <span>Admin Mode Active</span>
                </div>
            </div>

            {/* Stats Grid */}
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

            {/* Users Table */}
            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="p-6 border-b border-slate-700/50">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <UserIcon size={20} className="text-blue-400" />
                        User Directory
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Identity</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-xs font-bold text-white border border-slate-600">
                                                {user.full_name?.charAt(0) || user.id.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{user.full_name}</div>
                                                <div className="text-xs text-slate-500 font-mono">@{user.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${user.role === 'Admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                            user.role === 'Auditor' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 font-mono">
                                        {user.identity_number}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {user.has_wallet ? (
                                                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                                    <Wallet size={12} />
                                                    Wallet Active
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-500">No Wallet</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right text-slate-400">
                                        {user.joined_at?.split(' ')[0]}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
