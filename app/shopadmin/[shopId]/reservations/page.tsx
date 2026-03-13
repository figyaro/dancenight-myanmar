'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

interface UserProfile {
    id: string;
    nickname: string;
    email?: string;
    role: string;
}

interface Room {
    id: string;
    name: string;
}

interface Reservation {
    id: string;
    room_id: string;
    user_id: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    notes: string;
    created_at: string;
    user: UserProfile;
    room: Room;
}

export default function ShopReservations() {
    const { shopId } = useParams();
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const fetchReservations = async () => {
        setLoading(true);
        setReservations([]); // Clear stale data to prevent it showing in wrong tabs
        try {
            let query = supabase
                .from('room_reservations')
                .select(`
                    *,
                    user:users!user_id (
                        id,
                        nickname,
                        email,
                        role
                    ),
                    room:shop_rooms!room_id!inner (
                        id,
                        name,
                        shop_id
                    )
                `)
                .eq('room.shop_id', shopId)
                .order('start_time', { ascending: true });

            if (filterStatus !== 'all') {
                query = query.eq('status', filterStatus);
            }

            const { data, error } = await query;

            if (error) {
                console.error('=== Supabase Fetch Error ===');
                console.error('Message:', error.message);
                console.error('Code:', error.code);
                console.error('Details:', error.details);
                console.error('Hint:', error.hint);
                throw error;
            }
            
            console.log(`Success: Loaded ${data?.length} reservations for ${filterStatus}`);
            setReservations(data || []);
        } catch (err: any) {
            console.error('Error in fetchReservations:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!shopId) return;
        
        // Initial fetch
        fetchReservations();

        // Real-time subscription
        const channel = supabase
            .channel(`shop-reservations-${shopId}`)
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'room_reservations' 
            }, () => fetchReservations())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [shopId, filterStatus]);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('room_reservations')
                .update({ status: newStatus })
                .eq('id', id);
            
            if (error) throw error;
            // fetchReservations will be triggered by postgres_changes
        } catch (err: any) {
            alert('Error updating status: ' + err.message);
        }
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter">Reservations</h2>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Manage room bookings and schedules</p>
                </div>
                
                <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                    {['all', 'pending', 'confirmed', 'cancelled', 'completed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${filterStatus === status ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20' : 'text-zinc-500 hover:text-white'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/5">
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Guest</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Room</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Schedule</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                        {reservations.map((res) => {
                            const date = new Date(res.start_time);
                            const startTime = new Date(res.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const endTime = new Date(res.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            
                            return (
                                <tr key={res.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-xs font-black">
                                                {(res.user?.nickname || 'U').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white group-hover:text-pink-500 transition-colors uppercase tracking-tight">{res.user?.nickname || 'Anonymous'}</p>
                                                <p className="text-[10px] font-bold text-zinc-500 tracking-widest">{res.user?.role?.toUpperCase()}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="px-3 py-1.5 bg-zinc-800 rounded-lg text-[10px] font-black tracking-widest uppercase border border-white/5">
                                            {res.room?.name}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="font-bold text-zinc-200">{date.toLocaleDateString()}</p>
                                        <p className="text-[10px] font-black text-pink-500/60 tracking-widest uppercase">{startTime} - {endTime}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border ${
                                            res.status === 'confirmed' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                            res.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                                            res.status === 'cancelled' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                            'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                                        }`}>
                                            {res.status}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            {res.status === 'pending' && (
                                                <button 
                                                    onClick={() => updateStatus(res.id, 'confirmed')}
                                                    className="px-4 py-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Confirm
                                                </button>
                                            )}
                                            {res.status !== 'cancelled' && (
                                                <button 
                                                    onClick={() => updateStatus(res.id, 'cancelled')}
                                                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {reservations.length === 0 && (
                    <div className="py-20 text-center">
                        <p className="text-zinc-500 font-bold italic">No reservations found for the selected filter.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
