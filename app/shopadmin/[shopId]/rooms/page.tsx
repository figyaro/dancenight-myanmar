'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

export default function RoomManagement() {
    const { shopId } = useParams();
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRooms = async () => {
            const { data } = await supabase.from('shop_rooms').select('*').eq('shop_id', shopId);
            setRooms(data || []);
            setLoading(false);
        };
        if (shopId) fetchRooms();
    }, [shopId]);

    const addRoom = async () => {
        const name = prompt('Room name (e.g. VIP-1):');
        if (!name) return;
        const capacity = parseInt(prompt('Capacity:') || '10');
        
        const { error } = await supabase.from('shop_rooms').insert([{ shop_id: shopId, name, capacity }]);
        if (error) alert(error.message);
        else {
            const { data } = await supabase.from('shop_rooms').select('*').eq('shop_id', shopId);
            setRooms(data || []);
        }
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tight text-white/90">KTV Room Inventory</h2>
                <button 
                    onClick={addRoom}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black tracking-widest transition-all uppercase"
                >
                    + NEW ROOM
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {rooms.map((room) => (
                    <div key={room.id} className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl transition-all hover:border-pink-500/30">
                        <div className="flex justify-between items-start mb-6">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-md tracking-tighter ${
                                room.status === 'available' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                                {room.status?.toUpperCase()}
                            </span>
                            <span className="text-zinc-600 text-sm">🚪</span>
                        </div>
                        <h3 className="font-black text-lg mb-1">{room.name}</h3>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Capacity: {room.capacity} Persons</p>
                        
                        <div className="flex gap-2">
                            <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all">
                                Edit
                            </button>
                            <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all">
                                Status
                            </button>
                        </div>
                    </div>
                ))}

                {rooms.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-zinc-900/20 rounded-3xl border border-dashed border-white/10">
                        <p className="text-zinc-500 font-bold italic">No rooms configured.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
