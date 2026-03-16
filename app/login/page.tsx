'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            router.push('/home');
        } catch (err: any) {
            console.error('Login error:', err);
            setError('Invalid email or password.');
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
            <div className="absolute top-[-20%] left-[-20%] w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="z-10 w-full max-w-sm mx-auto mt-16">
                <h1 className="text-3xl font-bold mb-2">Login</h1>
                <p className="text-zinc-400 text-sm mb-6">Welcome back!</p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                    <div className="space-y-5">
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
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-zinc-400">Password</label>
                                <Link href="/forgot-password" id="forgot-password-link" className="text-xs text-pink-500 hover:text-pink-400">
                                    Forgot Password?
                                </Link>
                            </div>
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
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-zinc-500 text-sm">
                        Don't have an account?{' '}
                        <Link href="/register" className="text-pink-400 hover:text-pink-300 font-medium">
                            Sign Up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
