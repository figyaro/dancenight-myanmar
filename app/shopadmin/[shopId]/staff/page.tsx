'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

export default function StaffManagement() {
    const { shopId } = useParams();
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStaff = async () => {
            const { data } = await supabase.from('shop_staff').select('*').eq('shop_id', shopId);
            setStaff(data || []);
            setLoading(false);
        };
        if (shopId) fetchStaff();
    }, [shopId]);

    const addStaff = async () => {
        const name = prompt('Enter staff/DJ name:');
        if (!name) return;
        const role = prompt('Enter role (e.g. Resident DJ, Performer):');
        
        const { error } = await supabase.from('shop_staff').insert([{ shop_id: shopId, name, role }]);
        if (error) alert(error.message);
        else {
            // refresh
            const { data } = await supabase.from('shop_staff').select('*').eq('shop_id', shopId);
            setStaff(data || []);
        }
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tight">Staff & Entertainment</h2>
                <button 
                    onClick={addStaff}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black tracking-widest transition-all uppercase"
                >
                    + ADD STAFF
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {staff.map((s) => (
                    <div key={s.id} className="bg-zinc-900 border border-white/5 p-6 rounded-3xl group transition-all hover:bg-zinc-800/50">
                        <div className="w-full aspect-square rounded-2xl bg-zinc-800 mb-4 flex items-center justify-center text-3xl overflow-hidden border border-white/5">
                            {s.image_url ? <img src={s.image_url} className="w-full h-full object-cover" /> : '🎧'}
                        </div>
                        <h3 className="font-black text-sm mb-1">{s.name}</h3>
                        <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest">{s.role || 'Performer'}</p>
                    </div>
                ))}

                {staff.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-zinc-900/20 rounded-3xl border border-dashed border-white/10">
                        <p className="text-zinc-500 font-bold italic">No staff profiles registered.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
