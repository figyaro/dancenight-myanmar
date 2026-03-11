'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';

export default function ShopDashboard() {
    const { shopId } = useParams();
    const [stats, setStats] = useState({
        posts: 0,
        followers: 0,
        reservations: 0,
        reviews: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Placeholder fetch logic
                const [p, f, r, rv] = await Promise.all([
                    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
                    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', shopId), // Assuming follows table supports shop_id
                    supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('shop_id', shopId), // Assuming check-in/res
                    supabase.from('likes').select('id', { count: 'exact', head: true }), // Placeholder for reviews
                ]);

                setStats({
                    posts: p.count || 0,
                    followers: f.count || 0,
                    reservations: r.count || 0,
                    reviews: rv.count || 0
                });
            } catch (err) {
                console.error('Error fetching shop stats:', err);
            } finally {
                setLoading(false);
            }
        };

        if (shopId) fetchStats();
    }, [shopId]);

    const cards = [
        { label: 'Shop Posts', value: stats.posts, icon: '📝', color: 'from-blue-600/20 to-cyan-600/20' },
        { label: 'Followers', value: stats.followers, icon: '👥', color: 'from-pink-600/20 to-purple-600/20' },
        { label: 'Active Leads', value: stats.reservations, icon: '📅', color: 'from-orange-600/20 to-red-600/20' },
        { label: 'Total Reviews', value: stats.reviews, icon: '⭐', color: 'from-yellow-600/20 to-orange-600/20' },
    ];

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <div key={i} className="bg-zinc-900 border border-white/5 p-6 rounded-[2rem] backdrop-blur-3xl group hover:border-white/10 transition-all duration-500">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${card.color} flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform`}>
                            {card.icon}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">{card.label}</p>
                        <p className="text-4xl font-black tracking-tighter">{card.value.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-zinc-900 border border-white/5 rounded-[2.5rem] p-10 backdrop-blur-3xl">
                    <h4 className="font-black text-xs uppercase tracking-[0.4em] text-zinc-500 mb-8 flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                        Engagement Graph
                    </h4>
                    <div className="h-64 flex items-end gap-3 px-4">
                        {[40, 70, 45, 90, 65, 80, 50, 85, 60, 95, 75, 100].map((h, i) => (
                            <div key={i} className="flex-1 bg-gradient-to-t from-pink-600/40 to-pink-500/10 rounded-t-lg transition-all hover:to-pink-500/30 cursor-pointer group relative" style={{ height: `${h}%` }}>
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    {h}%
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-6 px-4 text-[10px] font-black text-zinc-600 tracking-widest uppercase">
                        <span>Jan</span>
                        <span>Jun</span>
                        <span>Dec</span>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-900/40">
                        <h4 className="font-black text-xs uppercase tracking-widest mb-2 opacity-60">Pro Feature</h4>
                        <h3 className="text-2xl font-black leading-tight mb-4">Unlock Customer Attraction Tools</h3>
                        <p className="text-sm font-bold opacity-80 leading-relaxed mb-6">Reach thousands of active dancers and party-goers in your area with targeted ads.</p>
                        <button className="w-full py-4 bg-white text-indigo-700 rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase hover:scale-[1.03] transition-all">
                            Upgrade Now
                        </button>
                    </div>

                    <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-8">
                        <h4 className="font-black text-[10px] uppercase tracking-widest text-zinc-500 mb-4">Quick Links</h4>
                        <div className="space-y-2">
                            <button className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-all flex items-center justify-between">
                                Edit Business Hours <span>➔</span>
                            </button>
                            <button className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold transition-all flex items-center justify-between">
                                Manage Staff <span>➔</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
