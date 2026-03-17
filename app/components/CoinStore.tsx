'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { getEffectiveUserId } from '../../lib/auth-util';

interface CoinTier {
    id: string;
    coins: number;
    price: string;
    label: string;
    popular?: boolean;
    color: string;
}

const COIN_TIERS: CoinTier[] = [
    { id: '1', coins: 500, price: '¥5,000', label: 'Starter Pack', color: 'from-blue-500 to-cyan-400' },
    { id: '2', coins: 1200, price: '¥10,000', label: 'Pro Pack', popular: true, color: 'from-pink-600 to-rose-400' },
    { id: '3', coins: 3000, price: '¥25,000', label: 'Elite Bundle', color: 'from-amber-400 to-orange-500' },
    { id: '4', coins: 6500, price: '¥50,000', label: 'VIP Vault', color: 'from-purple-600 to-indigo-500' },
];

export default function CoinStore({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handlePurchase = async (tier: CoinTier) => {
        setIsProcessing(true);
        setStatus('idle');
        
        try {
            const userId = await getEffectiveUserId();
            if (!userId) throw new Error('Not authenticated');

            // Simulate Payment Success and call our transaction RPC
            // In a real app, this would be a webhook from Stripe/Apple/Google
            const { data, error } = await supabase.rpc('process_dtip_transaction', {
                p_sender_id: null, // System purchase
                p_receiver_id: userId,
                p_amount: tier.coins,
                p_type: 'purchase',
                p_metadata: { tier_id: tier.id, price: tier.price }
            });

            if (error) throw error;
            
            setStatus('success');
            setTimeout(() => {
                onClose();
                setStatus('idle');
            }, 2000);
        } catch (err) {
            console.error('Purchase failed:', err);
            setStatus('error');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
            
            <div className="relative w-full max-w-md bg-zinc-900/80 backdrop-blur-3xl border border-white/20 rounded-[3rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]">
                
                {/* Header */}
                <div className="p-8 pb-4 flex justify-between items-start">
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter leading-none mb-2">dtip Store</h2>
                        <p className="text-[10px] font-black text-pink-500 uppercase tracking-[0.3em]">Enhance Your Experience</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {/* Success/Error Overlays */}
                {status === 'success' && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500">
                        <div className="w-20 h-20 rounded-full bg-pink-600 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(236,72,153,0.5)]">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>
                        </div>
                        <h3 className="text-xl font-black text-white tracking-widest uppercase">Purchase Successful</h3>
                    </div>
                )}

                <div className="p-8 pt-0 max-h-[60vh] overflow-y-auto scrollbar-hide space-y-4 pb-12">
                    {COIN_TIERS.map((tier) => (
                        <button
                            key={tier.id}
                            onClick={() => handlePurchase(tier)}
                            disabled={isProcessing}
                            className="w-full relative group active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-[2rem] group-hover:bg-white/10 group-hover:border-white/20 transition-all text-left">
                                <div className="flex items-center gap-5">
                                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${tier.color} flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-500`}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M12 6l-3 3M12 6l3 3M12 18l-3-3M12 18l3-3" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-2xl font-black text-white tracking-tighter">{tier.coins.toLocaleString()}</span>
                                            <span className="text-[10px] font-black uppercase text-zinc-500">dtip</span>
                                        </div>
                                        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">{tier.label}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-white tracking-tighter mb-1">{tier.price}</p>
                                    {tier.popular && (
                                        <span className="px-3 py-1 bg-pink-600 rounded-full text-[8px] font-black uppercase tracking-widest text-white shadow-lg">Popular</span>
                                    )}
                                </div>
                                
                                {/* Inner Shadow for Depth */}
                                <div className="absolute inset-0 rounded-[2rem] border border-white/5 pointer-events-none" />
                            </div>
                        </button>
                    ))}
                </div>

                <div className="p-8 pt-0 pb-10 text-center">
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-4">Secured by dtip Financial Infrastructure</p>
                    <div className="flex justify-center gap-6 opacity-30 grayscale contrast-125 scale-75">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-4" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-6" />
                        <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-4" />
                    </div>
                </div>
            </div>
        </div>
    );
}
