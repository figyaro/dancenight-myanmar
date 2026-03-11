'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';

export default function EventManagement() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('date', { ascending: true });
        
        if (error) console.error('Error fetching events:', error);
        else setEvents(data || []);
        setLoading(false);
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black">Scheduled Events</h2>
                <div className="flex gap-4">
                    <button className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-2xl text-[10px] font-black tracking-widest transition-all">
                        + CREATE EVENT
                    </button>
                    <button onClick={fetchEvents} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black tracking-widest transition-all">
                        REFRESH
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                    <div key={event.id} className="bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-xl flex flex-col group">
                        <div className="h-40 relative">
                            <img src={event.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                            <div className="absolute bottom-4 left-6">
                                <p className="text-xs font-black text-pink-500 uppercase tracking-widest mb-1">
                                    {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </p>
                                <h3 className="font-black text-white">{event.title}</h3>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-xs text-zinc-400 font-bold">
                                    <span>📍</span> {event.place}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-400 font-bold">
                                    <span>💰</span> {event.fee || 'Free'}
                                </div>
                            </div>
                            <div className="mt-auto grid grid-cols-2 gap-3">
                                <button className="py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase">
                                    Edit
                                </button>
                                <button className="py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {events.length === 0 && (
                <div className="py-20 text-center bg-zinc-900/20 rounded-3xl border border-dashed border-white/5">
                    <p className="text-zinc-500 font-bold italic">No events found.</p>
                </div>
            )}
        </div>
    );
}
