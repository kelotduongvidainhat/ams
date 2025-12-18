
import { useState } from 'react';
import { registerUser, getUser } from '../services/api';
import { User, Lock, UserPlus, Fingerprint, Activity, LogIn } from 'lucide-react';

interface AuthPageProps {
    onLogin: () => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        fullName: '',
        identityNumber: '',
        role: 'User'
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMsg(null);

        try {
            if (isLogin) {
                // Login Simulation (Check if User Exists on Chain)
                const user = await getUser(formData.id);
                if (user && user.id) {
                    setMsg({ type: 'success', text: `Welcome back, ${user.full_name} (${user.role})!` });
                    // In a real app, you would save token/user to context/localstorage here
                }
            } else {
                // Register
                await registerUser({
                    id: formData.id,
                    full_name: formData.fullName,
                    identity_number: formData.identityNumber,
                    role: formData.role
                });
                setMsg({ type: 'success', text: 'Account registered onto Blockchain successfully!' });
                // Switch to login
                // setTimeout(() => { onLogin(); }, 2000);
            }
        } catch (err: any) {
            console.error(err);
            const errorText = err.response?.data?.error || err.message || 'Operation failed';
            setMsg({ type: 'error', text: isLogin ? 'User ID not found on Blockchain.' : errorText });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="glass-panel w-full max-w-md p-8 rounded-2xl relative overflow-hidden">
                {/* Decorative Background Blob */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>

                <div className="relative z-10">
                    <h2 className="text-3xl font-bold text-white mb-2 text-center">
                        {isLogin ? 'Access Portal' : 'Citizen Registry'}
                    </h2>
                    <p className="text-slate-400 text-center mb-8">
                        {isLogin ? 'Authenticate with your digital ID' : 'Create your decentralized identity'}
                    </p>

                    {msg && (
                        <div className={`mb - 6 p - 4 rounded - lg flex items - start gap - 3 text - sm ${msg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            } `}>
                            <Activity size={18} className="shrink-0 mt-0.5" />
                            <span>{msg.text}</span>
                        </div>
                    )}

                    {msg?.type === 'success' && isLogin && (
                        <button
                            onClick={onLogin}
                            className="w-full mb-6 py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-bold hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            go to dashboard <Activity size={18} />
                        </button>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">User ID</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input
                                    name="id" value={formData.id} onChange={handleChange}
                                    type="text" required placeholder="e.g. user01"
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                            </div>
                        </div>

                        {!isLogin && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Full Name</label>
                                        <input
                                            name="fullName" value={formData.fullName} onChange={handleChange}
                                            type="text" required placeholder="John Doe"
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Role</label>
                                        <select
                                            name="role" value={formData.role} onChange={handleChange}
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
                                        >
                                            <option value="User">Citizen</option>
                                            <option value="Admin">Official</option>
                                            <option value="Auditor">Auditor</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Identity Number</label>
                                    <div className="relative">
                                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                        <input
                                            name="identityNumber" value={formData.identityNumber} onChange={handleChange}
                                            type="text" required placeholder="Card / Passport No."
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <button
                            type="submit" disabled={loading}
                            className="w-full py-3 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-blue-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <Activity className="animate-spin" />
                            ) : (
                                isLogin ? <><Lock size={18} /> Login via Blockchain</> : <><UserPlus size={18} /> Register Identity</>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            {isLogin ? (
                                <>New citizen? <span className="text-blue-400">Register now</span></>
                            ) : (
                                <><LogIn size={14} /> Already have an ID? Login</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
