import { useEffect, useState } from 'react';
import { Wallet, Lock, Unlock, Shield } from 'lucide-react';

import { getAllUsers, setUserStatus } from '../../../services/api';
import type { UserStats } from '../../../types';

export default function IdentityManagement() {
    const [users, setUsers] = useState<UserStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchUsers = async () => {
        try {
            const data = await getAllUsers();
            setUsers(data);
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleToggleLock = async (userId: string, currentStatus: string) => {
        if (!confirm(`Are you sure you want to ${currentStatus === 'Locked' ? 'unlock' : 'lock'} this user?`)) return;

        setProcessingId(userId);
        const newStatus = currentStatus === 'Locked' ? 'Active' : 'Locked';

        try {
            await setUserStatus(userId, newStatus);
            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update user status");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div>Loading users...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Shield className="text-purple-400" /> Identity Management
                </h2>
                <span className="text-sm text-slate-400">{users.length} Users Registered</span>
            </div>

            <div className="glass-panel rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-900/50 text-slate-400 uppercase text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Identity</th>
                                <th className="px-6 py-4">Wallet</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
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
                                        {user.has_wallet ? (
                                            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                                <Wallet size={12} /> Active
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-500">Missing</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border flex w-fit items-center gap-1 ${user.status === 'Locked'
                                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                            : 'bg-green-500/10 text-green-400 border-green-500/20'
                                            }`}>
                                            {user.status === 'Locked' ? <Lock size={10} /> : <Unlock size={10} />}
                                            {user.status || 'Active'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {user.role !== 'Admin' && (
                                            <button
                                                onClick={() => handleToggleLock(user.id, user.status || 'Active')}
                                                disabled={processingId === user.id}
                                                className={`p-2 rounded-lg transition-colors ${user.status === 'Locked'
                                                    ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                                    } disabled:opacity-50`}
                                                title={user.status === 'Locked' ? "Unlock Account" : "Lock Account"}
                                            >
                                                {processingId === user.id ? (
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                ) : (
                                                    user.status === 'Locked' ? <Unlock size={16} /> : <Lock size={16} />
                                                )}
                                            </button>
                                        )}
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
