'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getEffectiveUserId } from '../lib/auth-util';

const TIP_AMOUNTS = [100, 300, 500, 1000, 3000, 5000];

interface TipModalProps {
    isOpen: boolean;
    onClose: () => void;
    receiverId: string;
    receiverName: string;
    referenceType?: string;
    referenceId?: string;
}

export default function TipModal({ isOpen, onClose, receiverId, receiverName, referenceType, referenceId }: TipModalProps) {
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSendTip = async () => {
        if (!selectedAmount) return;
        
        setIsProcessing(true);
        setStatus('idle');
        setErrorMessage('');

        try {
            const senderId = await getEffectiveUserId();
            if (!senderId) throw new Error('Please login to send tips');

            const { data, error } = await supabase.rpc('process_dtip_transaction', {
                p_sender_id: senderId,
                p_receiver_id: receiverId,
                p_amount: selectedAmount,
                p_type: 'tip',
                p_reference_type: referenceType,
                p_reference_id: referenceId
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.error);

            setStatus('success');
            setTimeout(() => {
                onClose();
                setStatus('idle');
                setSelectedAmount(null);
            }, 2000);
        } catch (err: any) {
            console.error('Tipping failed:', err);
            setStatus('error');
            setErrorMessage(err.message || 'Transaction failed');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose} />
            
            <div className="relative w-full max-w-sm bg-zinc-900/90 backdrop-blur-3xl border border-white/20 rounded-[3rem] p-8 overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500">
                
                {/* Status Overlays */}
                {status === 'success' && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-500">
                        <div className="w-20 h-20 rounded-full bg-pink-600 flex items-center justify-center mb-6 animate-bounce shadow-[0_0_50px_rgba(236,72,153,0.5)]">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17l-5-5"/></svg>
                        </div>
                        <h3 className="text-xl font-black text-white tracking-widest uppercase">Tip Sent!</h3>
                        <p className="text-pink-500 font-black text-[10px] mt-2 tracking-widest uppercase">Grateful Appreciation</p>
                    </div>
                )}

                <div className="text-center mb-8">
                    <h2 className="text-2xl font-black text-white tracking-tighter leading-none mb-2 uppercase">Send Appreciation</h2>
                    <p className="text-[10px] font-black text-pink-500 uppercase tracking-[0.2em] opacity-80">Support {receiverName}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-8">
                    {TIP_AMOUNTS.map((amount) => (
                        <button
                            key={amount}
                            onClick={() => setSelectedAmount(amount)}
                            className={`py-4 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-1 ${
                                selectedAmount === amount
                                ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-900/40'
                                : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'
                            }`}
                        >
                            <span className="text-lg font-black tracking-tighter">{amount}</span>
                            <span className="text-[8px] font-black uppercase opacity-60">dtip</span>
                        </button>
                    ))}
                </div>

                {status === 'error' && (
                    <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl mb-6 text-center animate-in slide-in-from-top-4">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{errorMessage}</p>
                    </div>
                )}

                <div className="space-y-3">
                    <button
                        onClick={handleSendTip}
                        disabled={!selectedAmount || isProcessing}
                        className="w-full py-5 bg-white text-black rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] transition-all hover:bg-pink-600 hover:text-white disabled:opacity-30 active:scale-[0.98]"
                    >
                        {isProcessing ? 'Processing...' : 'Confirm Tip'}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest hover:text-white transition-colors"
                    >
                        Cancel Gifting
                    </button>
                </div>

                {/* Decorative Sine Ribbon */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 animate-pulse" />
            </div>
        </div>
    );
}
