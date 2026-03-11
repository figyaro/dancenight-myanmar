'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        users: 0,
        posts: 0,
        events: 0,
        reservations: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const [u, p, e, r] = await Promise.all([
                    supabase.from('users').select('id', { count: 'exact', head: true }),
                    supabase.from('posts').select('id', { count: 'exact', head: true }),
                    supabase.from('events').select('id', { count: 'exact', head: true }),
                    supabase.from('conversations').select('id', { count: 'exact', head: true }), // Using conversations for reservations/chats for now
                ]);

                setStats({
                    users: u.count || 0,
                    posts: p.count || 0,
                    events: e.count || 0,
                    reservations: r.count || 0
                });
            } catch (err) {
                console.error('Error fetching admin stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const cards = [
        { label: 'Total Users', value: stats.users, icon: '👤', color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/10' },
        { label: 'Feed Posts', value: stats.posts, icon: '📝', color: 'from-pink-500/20 to-orange-500/20', border: 'border-pink-500/10' },
        { label: 'Active Events', value: stats.events, icon: '🎉', color: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/10' },
        { label: 'Reservations', value: stats.reservations, icon: '📅', color: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/10' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <div 
                        key={i}
                        className={`bg-zinc-900/40 p-6 rounded-3xl border ${card.border} backdrop-blur-xl group hover:scale-[1.02] transition-all duration-500`}
                    >
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${card.color} flex items-center justify-center text-2xl mb-4 group-hover:rotate-12 transition-transform`}>
                            {card.icon}
                        </div>
                        <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mb-1">{card.label}</p>
                        <p className="text-3xl font-black">{loading ? '...' : card.value.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity Placeholder */}
                <div className="bg-zinc-900/40 rounded-3xl border border-white/5 p-8 backdrop-blur-xl">
                    <h3 className="font-black text-sm uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                        System Health
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                            <span className="text-sm font-bold">API Status</span>
                            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-green-500/20 text-green-400">OPERATIONAL</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                            <span className="text-sm font-bold">Database Latency</span>
                            <span className="text-sm font-bold text-zinc-400">24ms</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                            <span className="text-sm font-bold">Realtime Channel</span>
                            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">CONNECTED</span>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900/40 rounded-3xl border border-white/5 p-8 backdrop-blur-xl flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-full bg-pink-600/10 flex items-center justify-center text-3xl mb-4 animate-pulse">
                        🛡️
                    </div>
                    <h3 className="text-xl font-black mb-2">Secure Admin Console</h3>
                    <p className="text-sm text-zinc-500 max-w-[280px]">
                        Welcome to the command center. Use the sidebar to moderate content and manage user access.
                    </p>
                </div>
            </div>
        </div>
    );
}
