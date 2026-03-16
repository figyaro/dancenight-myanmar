'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

function ResetPasswordContent() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handlePasswordUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            if (!isSupabaseConfigured) {
                throw new Error('Supabase configuration not found.');
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: password,
            });

            if (updateError) throw updateError;

            setMessage('Password updated successfully. Redirecting to home in 5 seconds...');
            setTimeout(() => {
                router.push('/home');
            }, 5000);
        } catch (err: any) {
            console.error('Update password error:', err);
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-black min-h-screen text-white flex flex-col px-6 pt-12 pb-6 relative overflow-hidden">
            {/* Decoration */}
            <div className="absolute top-[-20%] right-[-20%] w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="z-10 w-full max-w-sm mx-auto mt-16">
                <h1 className="text-3xl font-bold mb-2">Set New Password</h1>
                <p className="text-zinc-400 text-sm mb-8">Please enter your new password.</p>

                {message && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-500 text-sm p-4 rounded-xl mb-6">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-4 rounded-xl mb-6">
                        {error}
                    </div>
                )}

                {!message && (
                    <form onSubmit={handlePasswordUpdate} className="flex flex-col gap-6">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">New Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-2">Confirm Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition-colors"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 rounded-xl text-center shadow-[0_4px_14px_0_rgba(219,39,119,0.39)] transition-all duration-300 hover:shadow-[0_6px_20px_rgba(219,39,119,0.23)] hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                )}

                {message && (
                    <button
                        onClick={() => router.push('/home')}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 rounded-xl text-center border border-zinc-700 transition-all mt-4"
                    >
                        Go to Home Now
                    </button>
                )}
            </div>
        </div>
    );
}

export default function ResetPassword() {
    return (
        <Suspense fallback={
            <div className="bg-black min-h-screen text-white flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}
