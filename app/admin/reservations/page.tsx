'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';

export default function ReservationManagement() {
    const [reservations, setReservations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReservations();
    }, []);

    const fetchReservations = async () => {
        setLoading(true);
        // Using conversations as a proxy for 'Reservation/Leads'
        const { data, error } = await supabase
            .from('conversations')
            .select(`
                *,
                messages(text, created_at)
            `)
            .order('updated_at', { ascending: false });
        
        if (error) console.error('Error fetching reservations:', error);
        else setReservations(data || []);
        setLoading(false);
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-xl font-black uppercase tracking-tighter">Active Lead Management</h2>

            <div className="grid grid-cols-1 gap-4">
                {reservations.map((res) => (
                    <div key={res.id} className="bg-zinc-900/40 rounded-3xl border border-white/5 p-6 backdrop-blur-xl flex items-center justify-between group hover:border-pink-500/20 transition-all">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl border border-white/5">
                                💬
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">{res.name || 'Anonymous Inquiry'}</h3>
                                <p className="text-xs text-zinc-500 font-medium">Last updated: {new Date(res.updated_at).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="hidden md:block text-right">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Status</p>
                                <span className="text-[10px] font-black px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/10">
                                    IN PROGRESS
                                </span>
                            </div>
                            <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black tracking-widest transition-all">
                                VIEW LOGS
                            </button>
                        </div>
                    </div>
                ))}

                {reservations.length === 0 && (
                    <div className="py-20 text-center bg-zinc-900/20 rounded-3xl border border-dashed border-white/5">
                        <p className="text-zinc-500 font-bold italic">No active reservations found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
