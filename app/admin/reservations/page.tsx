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
        try {
            const { data, error } = await supabase
                .from('room_reservations')
                .select(`
                    *,
                    user:users(nickname, avatar_url, role),
                    room:shop_rooms(name, shop_id)
                `)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Error fetching reservations:', error);
                throw error;
            }
            setReservations(data || []);
        } catch (err: any) {
            console.error('Fetch Error:', err.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteReservation = async (id: string) => {
        if (!confirm('Are you sure you want to delete this reservation record?')) return;
        const { error } = await supabase.from('room_reservations').delete().eq('id', id);
        if (error) alert('Error: ' + error.message);
        else setReservations(prev => prev.filter(r => r.id !== id));
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tighter">Global Reservation Management</h2>
                <button 
                    onClick={fetchReservations}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black tracking-widest transition-all"
                >
                    REFRESH
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {reservations.map((res) => (
                    <div key={res.id} className="bg-zinc-900/40 rounded-3xl border border-white/5 p-6 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between group hover:border-pink-500/20 transition-all gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-zinc-800 flex-shrink-0">
                                {res.user?.avatar_url ? (
                                    <img 
                                        src={res.user.avatar_url} 
                                        className="w-full h-full object-cover"
                                        alt=""
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-800">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-sm flex items-center gap-2">
                                    {res.user?.nickname || 'Anonymous'}
                                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-zinc-500 uppercase">{res.user?.role}</span>
                                </h3>
                                <p className="text-xs text-zinc-400 font-medium">
                                    Room: <span className="text-zinc-200 font-bold">{res.room?.name || 'Unknown'}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 md:gap-8">
                            <div className="text-left md:text-right">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Schedule</p>
                                <p className="text-xs font-bold whitespace-nowrap">
                                    {new Date(res.start_time).toLocaleDateString()}
                                </p>
                                <p className="text-[10px] font-bold text-pink-500">
                                    {new Date(res.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                    {new Date(res.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>

                            <div>
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Status</p>
                                <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${
                                    res.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                    res.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                    res.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                }`}>
                                    {res.status.toUpperCase()}
                                </span>
                            </div>

                            <button 
                                onClick={() => deleteReservation(res.id)}
                                className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all border border-red-500/20 ml-auto md:ml-0"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
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
