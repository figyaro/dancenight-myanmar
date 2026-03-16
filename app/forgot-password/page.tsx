'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export default function ForgotPassword() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            if (!isSupabaseConfigured) {
                const missing = [];
                if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('URL');
                if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push('Key');
                throw new Error(`Supabase configuration (${missing.join(' & ')}) not found. Check if key names are correct and Production environment is checked in Vercel settings.`);
            }

            // Vercel deployment URL or local URL
            const redirectTo = `${window.location.origin}/reset-password`;

            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: redirectTo,
            });

            if (resetError) throw resetError;

            setMessage('Password reset email sent. Please check your inbox.');
        } catch (err: any) {
            console.error('Reset password error:', err);
            setError(err.message || 'An error occurred. Please try again.');
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
            <div className="absolute top-[-20%] left-[-20%] w-96 h-96 bg-pink-600/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="z-10 w-full max-w-sm mx-auto mt-16">
                <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
                <p className="text-zinc-400 text-sm mb-8">Enter your registered email address and we'll send you a link to reset your password.</p>

                {message && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-500 text-sm p-4 rounded-xl mb-6 flex items-start gap-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        {message}
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-xl mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleResetRequest} className="flex flex-col gap-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition-colors"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !!message}
                        className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 rounded-xl text-center shadow-[0_4px_14px_0_rgba(219,39,119,0.39)] transition-all duration-300 hover:shadow-[0_6px_20px_rgba(219,39,119,0.23)] hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>

                    {message && (
                        <button
                            type="button"
                            onClick={() => router.push('/login')}
                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl text-center border border-zinc-700 transition-all"
                        >
                            Back to Login
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
