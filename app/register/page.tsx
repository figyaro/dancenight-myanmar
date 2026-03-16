'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function Register() {
    const router = useRouter();
    const [role, setRole] = useState<'user' | 'dancer'>('user');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { data, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        role,
                    }
                }
            });

            if (authError) throw authError;

            router.push('/home');
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'An error occurred during registration');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-black min-h-screen text-white flex flex-col px-6 pt-12 pb-6 relative overflow-hidden">
            {/* 戻るボタン */}
            <div className="absolute top-6 left-6 z-20">
                <button onClick={() => router.back()} className="text-zinc-400 hover:text-white flex items-center gap-1">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                    <span className="text-sm font-medium">Back</span>
                </button>
            </div>

            {/* 装飾 */}
            <div className="absolute top-[-20%] right-[-20%] w-96 h-96 bg-pink-600/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="z-10 w-full max-sm mx-auto mt-12">
                <h1 className="text-3xl font-bold mb-2">Create Account</h1>
                <p className="text-zinc-400 text-sm mb-8">Welcome to Dance Together!</p>

                <form onSubmit={handleRegister} className="flex flex-col gap-5">
                    {/* 役割選択（ユーザーかダンサーか） */}
                    <div className="mb-2">
                        <label className="block text-sm font-medium text-zinc-300 mb-3">
                            Please select your purpose
                        </label>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-4">
                                {error}
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole('user')}
                                className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${role === 'user'
                                    ? 'border-pink-500 bg-pink-500/10 text-pink-400'
                                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800'
                                    }`}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                                <span className="text-sm font-bold">General User</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRole('dancer')}
                                className={`py-3 px-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${role === 'dancer'
                                    ? 'border-pink-500 bg-pink-500/10 text-pink-400'
                                    : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:bg-zinc-800'
                                    }`}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2l3 5h4l-3 5 1.5 5.5L12 15l-5.5 2.5L8 12l-3-5h4z" />
                                </svg>
                                <span className="text-sm font-bold">Dancer</span>
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500 mt-3 text-center">
                            *Shop users can only be linked by administrators.
                        </p>
                    </div>

                    <div className="space-y-4 mt-2">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Name (Nickname)</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Yuki"
                                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Email Address</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition-colors"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 rounded-xl text-center shadow-[0_4px_14px_0_rgba(219,39,119,0.39)] transition-all duration-300 hover:shadow-[0_6px_20px_rgba(219,39,119,0.23)] hover:scale-[1.01] mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Registering...' : 'Register & Get Started'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-zinc-500 text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-pink-400 hover:text-pink-300 font-medium">
                            Login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
