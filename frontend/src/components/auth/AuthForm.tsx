import type { ChangeEvent, FormEvent } from 'react';
import { User as UserIcon, Lock, UserPlus, Fingerprint, Activity } from 'lucide-react';

interface AuthFormData {
    id: string;
    fullName: string;
    identityNumber: string;
    role: string;
}

interface AuthFormProps {
    isLogin: boolean;
    loading: boolean;
    formData: AuthFormData;
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    onSubmit: (e: FormEvent) => void;
}

export default function AuthForm({
    isLogin,
    loading,
    formData,
    onChange,
    onSubmit
}: AuthFormProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">User ID</label>
                <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        name="id" value={formData.id} onChange={onChange}
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
                                name="fullName" value={formData.fullName} onChange={onChange}
                                type="text" required placeholder="John Doe"
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Role</label>
                            <select
                                name="role" value={formData.role} onChange={onChange}
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
                                name="identityNumber" value={formData.identityNumber} onChange={onChange}
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
    );
}
