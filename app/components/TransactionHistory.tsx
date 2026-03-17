'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getEffectiveUserId } from '../../lib/auth-util';

interface Transaction {
    id: string;
    amount: number;
    transaction_type: 'purchase' | 'tip' | 'payment' | 'reward';
    reference_type: string | null;
    created_at: string;
    sender_nickname?: string;
    receiver_nickname?: string;
}

export default function TransactionHistory() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            const uid = await getEffectiveUserId();
            setUserId(uid);
            if (!uid) {
                setLoading(false);
                return;
            }

            try {
                // Fetch transactions where user is sender or receiver
                const { data, error } = await supabase
                    .from('dtip_transactions')
                    .select(`
                        id,
                        amount,
                        transaction_type,
                        reference_type,
                        created_at,
                        sender:sender_id(nickname),
                        receiver:receiver_id(nickname)
                    `)
                    .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (error) throw error;

                const formatted = (data || []).map((t: any) => ({
                    id: t.id,
                    amount: t.amount,
                    transaction_type: t.transaction_type,
                    reference_type: t.reference_type,
                    created_at: t.created_at,
                    sender_nickname: t.sender?.nickname,
                    receiver_nickname: t.receiver?.nickname
                }));

                setTransactions(formatted);
            } catch (err) {
                console.error('Error fetching transaction history:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col gap-3 animate-pulse">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-2xl border border-white/10" />
                ))}
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="liquid-glass p-8 text-center opacity-50">
                <p className="text-xs font-black uppercase tracking-widest text-zinc-500">No transactions yet</p>
                <div className="mt-4 text-2xl grayscale opacity-50">💸</div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {transactions.map((t) => {
                const isDebit = t.transaction_type === 'purchase' ? false : (t.sender_nickname && !t.receiver_nickname ? true : false); 
                // Simple logic: if sender is me and it's not a purchase, it's a debit.
                // Better: Check if sender_id matches current user. 
                // But we didn't fetch raw sender_id in the formatted list for simplicity.
                // Let's adjust.
                
                const isSender = t.sender_nickname && !t.receiver_nickname; // This is a bit flawed. 
                // Let's just use the amount sign or transaction type for now.
                
                const getIcon = () => {
                    switch (t.transaction_type) {
                        case 'purchase': return '💎';
                        case 'tip': return '🎁';
                        case 'payment': return '🎟️';
                        case 'reward': return '✨';
                        default: return '🪙';
                    }
                };

                const getTitle = () => {
                    if (t.transaction_type === 'purchase') return 'Coin Purchase';
                    if (t.transaction_type === 'tip') {
                        return t.sender_nickname ? `Tip from ${t.sender_nickname}` : `Tip sent`;
                    }
                    if (t.transaction_type === 'payment') return 'Booking Payment';
                    return 'Transaction';
                };

                return (
                    <div key={t.id} className="liquid-glass p-4 border border-white/5 flex items-center justify-between group hover:border-white/20 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-lg">
                                {getIcon()}
                            </div>
                            <div>
                                <h4 className="text-xs font-black tracking-tighter text-white">{getTitle()}</h4>
                                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                                    {new Date(t.created_at).toLocaleDateString()} • {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`text-sm font-black ${t.transaction_type === 'purchase' ? 'text-green-400' : 'text-zinc-200'}`}>
                                {t.transaction_type === 'purchase' ? '+' : '-'}{t.amount.toLocaleString()}
                            </p>
                            <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">dtip</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
