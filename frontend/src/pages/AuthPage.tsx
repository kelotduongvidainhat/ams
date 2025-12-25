import { useState } from 'react';
import axios from 'axios';
import { registerUser, login, setAuthToken } from '../services/api'; // Import new helpers
import { Activity, LogIn } from 'lucide-react';
import type { User } from '../types';
import AuthForm from '../components/auth/AuthForm';

interface AuthPageProps {
    onLogin: (user: User) => void;
    onExplore: () => void;
}

export default function AuthPage({ onLogin, onExplore }: AuthPageProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        id: '',
        fullName: '',
        identityNumber: '',
        role: 'User',
        password: '' // Added password
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
                // Login Flow
                const response = await login(formData.id, formData.password);
                if (response.token) {
                    setAuthToken(response.token);
                    const user = {
                        id: response.user.id,
                        role: response.user.role,
                        full_name: response.user.id, // Fallback as login doesn't return full name yet
                        identity_number: 'N/A',
                        status: 'Active' // Default status for logged in users
                    };
                    setMsg({ type: 'success', text: `Welcome back, ${user.id}!` });
                    setAuthenticatedUser(user);
                    onLogin(user); // Auto login
                }
            } else {
                // Register Flow
                const newUser = {
                    id: formData.id,
                    full_name: formData.fullName,
                    identity_number: formData.identityNumber,
                    role: formData.role,
                    password: formData.password
                };
                await registerUser(newUser);
                setMsg({ type: 'success', text: 'Account registered onto Blockchain successfully! Please Login.' });
                setIsLogin(true); // Switch to login
                setFormData(prev => ({ ...prev, password: '' }));
            }
        } catch (err: unknown) {
            console.error(err);
            let errorText = 'Operation failed';
            if (axios.isAxiosError(err) && err.response?.data?.error) {
                errorText = err.response.data.error;
            } else if (err instanceof Error) {
                errorText = err.message;
            }
            setMsg({ type: 'error', text: errorText });
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
                        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 text-sm ${msg.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            } `}>
                            <Activity size={18} className="shrink-0 mt-0.5" />
                            <span>{msg.text}</span>
                        </div>
                    )}

                    {msg?.type === 'success' && isLogin && authenticatedUser && (
                        <button
                            onClick={() => onLogin(authenticatedUser)}
                            className="w-full mb-6 py-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-bold hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            go to dashboard <Activity size={18} />
                        </button>
                    )}

                    <AuthForm
                        isLogin={isLogin}
                        loading={loading}
                        formData={formData}
                        onChange={handleChange}
                        onSubmit={handleSubmit}
                    />

                    <div className="mt-6 space-y-4 text-center">
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

                        <div className="pt-4 border-t border-white/5">
                            <button
                                onClick={onExplore}
                                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center justify-center gap-2 mx-auto"
                            >
                                <Activity size={14} /> Browse Public Explorer (No Login)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
