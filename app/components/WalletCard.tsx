'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getEffectiveUserId } from '../lib/auth-util';

export default function WalletCard({ onBuyCoins }: { onBuyCoins?: () => void }) {
    const [balance, setBalance] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBalance = async () => {
            const userId = await getEffectiveUserId();
            if (!userId) return;

            const { data, error } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', userId)
                .single();

            if (!error && data) {
                setBalance(data.balance);
            }
            setLoading(false);
        };

        fetchBalance();

        // Subscribe to changes in the wallet
        const channel = supabase
            .channel('wallet_changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'wallets'
                },
                (payload) => {
                    const userId = localStorage.getItem('effective_user_id') || localStorage.getItem('sb-fccpsqmqmqufymxuvxuv-auth-token') ? JSON.parse(localStorage.getItem('sb-fccpsqmqmqufymxuvxuv-auth-token')!).user.id : null;
                    if (payload.new.user_id === userId) {
                        setBalance(payload.new.balance);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="relative group overflow-hidden animate-in fade-in zoom-in duration-700">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-600/10 via-purple-600/5 to-transparent blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />
            
            <div className="relative bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 overflow-hidden shadow-2xl">
                {/* Decorative Elements */}
                <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-pink-500/10 blur-[60px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full" />
                
                <div className="flex flex-col space-y-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-pink-500 mb-1">
                                dtip Wallet
                            </h3>
                            <p className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest">
                                Premium Digital Asset
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white opacity-40">
                                <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                                <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                                <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
                            </svg>
                        </div>
                    </div>

                    <div className="flex items-baseline space-x-3">
                        {loading ? (
                            <div className="h-10 w-32 bg-white/5 animate-pulse rounded-xl" />
                        ) : (
                            <span className="text-5xl font-black text-white tracking-tighter drop-shadow-2xl">
                                {balance?.toLocaleString() || '0'}
                            </span>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">dtip</span>
                    </div>

                    <div className="pt-2">
                        <button 
                            onClick={onBuyCoins}
                            className="w-full py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] hover:bg-pink-600 hover:text-white transition-all duration-500 shadow-xl active:scale-95 group-hover:shadow-white/5"
                        >
                            Reload Wallet
                        </button>
                    </div>
                </div>

                {/* Glass Reflective Sine */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50" />
            </div>
        </div>
    );
}
