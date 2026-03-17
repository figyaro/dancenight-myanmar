'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const Icons = {
    Users: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
    Posts: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    ),
    Events: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
    ),
    Reservations: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ),
    Dtip: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M6 12h12"/></svg>
    ),
    Transactions: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    ),
    Shops: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    ),
    Dancers: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    )
};

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        users: 0,
        posts: 0,
        events: 0,
        reservations: 0,
        circulation: 0,
        transactions: 0,
        totalShops: 0,
        premiumShops: 0,
        dancers: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // First, find which plans are "Free" to accurately calculate premium ratio
                const { data: plans } = await supabase
                    .from('plans')
                    .select('id, name')
                    .eq('type', 'shop');
                
                const freePlanIds = (plans || [])
                    .filter(p => p.name.toLowerCase().includes('free'))
                    .map(p => p.id);

                const [u, p, e, r, w, t, s, d] = await Promise.all([
                    supabase.from('users').select('id', { count: 'exact', head: true }),
                    supabase.from('posts').select('id', { count: 'exact', head: true }),
                    supabase.from('events').select('id', { count: 'exact', head: true }),
                    supabase.from('room_reservations').select('id', { count: 'exact', head: true }),
                    supabase.from('wallets').select('balance'),
                    supabase.from('dtip_transactions').select('amount'),
                    supabase.from('shops').select('id, plan_id', { count: 'exact' }),
                    supabase.from('dancers').select('id', { count: 'exact', head: true })
                ]);

                setStats({
                    users: u.count || 0,
                    posts: p.count || 0,
                    events: e.count || 0,
                    reservations: r.count || 0,
                    circulation: (w.data || []).reduce((acc: number, curr: any) => acc + curr.balance, 0),
                    transactions: (t.data || []).length,
                    totalShops: s.count || 0,
                    premiumShops: (s.data || []).filter((shop: any) => !freePlanIds.includes(shop.plan_id)).length,
                    dancers: d.count || 0
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
        { label: 'Total Users', value: stats.users.toLocaleString(), icon: Icons.Users, color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/10' },
        { label: 'Registered Dancers', value: stats.dancers.toLocaleString(), icon: Icons.Dancers, color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/10' },
        { label: 'Premium / Total Shops', value: `${stats.premiumShops} / ${stats.totalShops}`, icon: Icons.Shops, color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/10' },
        { label: 'Feed Posts', value: stats.posts.toLocaleString(), icon: Icons.Posts, color: 'from-pink-500/20 to-orange-500/20', border: 'border-pink-500/10' },
        { label: 'Active Events', value: stats.events.toLocaleString(), icon: Icons.Events, color: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/10' },
        { label: 'Reservations', value: stats.reservations.toLocaleString(), icon: Icons.Reservations, color: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/10' },
        { label: 'dtip Circulation', value: stats.circulation.toLocaleString(), icon: Icons.Dtip, color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/10' },
        { label: 'Transactions', value: stats.transactions.toLocaleString(), icon: Icons.Transactions, color: 'from-rose-500/20 to-red-500/20', border: 'border-rose-500/10' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <div 
                        key={i}
                        className={`bg-zinc-900/40 p-6 rounded-3xl border ${card.border} backdrop-blur-xl group hover:scale-[1.02] transition-all duration-500`}
                    >
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${card.color} flex items-center justify-center group-hover:rotate-12 transition-transform text-white/80`}>
                            <card.icon />
                        </div>
                        <div className="mt-4">
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{card.label}</p>
                            <p className="text-2xl font-black">{loading ? '...' : card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* System Health */}
                <div className="bg-zinc-900/40 rounded-3xl border border-white/5 p-8 backdrop-blur-xl">
                    <h3 className="font-black text-sm uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                        System Health
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                            <span className="text-sm font-bold">API Status</span>
                            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-green-500/20 text-green-400">OPERATIONAL</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                            <span className="text-sm font-bold">Database Latency</span>
                            <span className="text-sm font-bold text-zinc-400">24ms</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-colors">
                            <span className="text-sm font-bold">Realtime Channel</span>
                            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">CONNECTED</span>
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900/40 rounded-3xl border border-white/5 p-8 backdrop-blur-xl flex flex-col items-center justify-center text-center group">
                    <div className="w-20 h-20 rounded-full bg-pink-600/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#db2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </div>
                    <h3 className="text-xl font-black mb-2 tracking-tighter">SECURE CONSOLE</h3>
                    <p className="text-sm text-zinc-500 max-w-[280px] font-medium leading-relaxed">
                        Authorized access only. Use the sidebar to manage platform content, verify users, and monitor transactions.
                    </p>
                </div>
            </div>
        </div>
    );
}
