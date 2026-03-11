'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';

export default function DancerManagement() {
    const [dancers, setDancers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDancers();
    }, []);

    const fetchDancers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('dancers')
            .select(`
                *,
                user:users(nickname, avatar_url)
            `)
            .order('created_at', { ascending: false });
        
        if (error) console.error('Error fetching dancers:', error);
        else setDancers(data || []);
        setLoading(false);
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black">Dancer Directory</h2>
                <button 
                    onClick={fetchDancers}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-xs font-black tracking-widest transition-all"
                >
                    REFRESH
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dancers.map((dancer) => (
                    <div key={dancer.id} className="bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-xl group hover:border-pink-500/20 transition-all p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-800 overflow-hidden border border-white/10">
                                {dancer.image_url ? (
                                    <img src={dancer.image_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-2xl">💃</div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-black text-lg">{dancer.name}</h3>
                                <p className="text-xs text-pink-500 font-bold uppercase tracking-widest">{dancer.style || 'Dance Artist'}</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-500 font-bold uppercase tracking-tighter">Location</span>
                                <span className="font-bold">{dancer.location || 'Yangon'}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-500 font-bold uppercase tracking-tighter">Experience</span>
                                <span className="font-bold">{dancer.experience || '3+ Years'}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold pt-4 border-t border-white/5">
                                <span className="text-zinc-500 uppercase tracking-tighter">Linked User</span>
                                <span className="text-zinc-300">{dancer.user?.nickname || 'Unlinked'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button className="py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase transition-all">
                                Edit Info
                            </button>
                            <button className="py-3 bg-pink-600/10 hover:bg-pink-600/20 text-pink-500 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase transition-all">
                                View Full
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {dancers.length === 0 && (
                <div className="py-20 text-center bg-zinc-900/20 rounded-3xl border border-dashed border-white/5">
                    <p className="text-zinc-500 font-bold italic">No dancers registered yet.</p>
                </div>
            )}
        </div>
    );
}
