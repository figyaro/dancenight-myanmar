'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';
import { PremiumChart, DailyStat } from '../../../components/PremiumChart';

interface AnalyticsEvent {
    id: string;
    event_type: string;
    created_at: string;
    post_id?: string;
}

interface DailyStat {
    date: string;
    impressions: number;
    actions: number;
    engagement: number;
}

export default function ShopAnalytics() {
    const { shopId } = useParams();
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState<AnalyticsEvent[]>([]);
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [activeMetric, setActiveMetric] = useState<'impressions' | 'actions' | 'engagement'>('impressions');

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // Determine time range
                const days = period === 'daily' ? 7 : period === 'weekly' ? 30 : 90;
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);

                const { data, error } = await supabase
                    .from('analytics_events')
                    .select('*')
                    .eq('shop_id', shopId)
                    .gte('created_at', startDate.toISOString())
                    .order('created_at', { ascending: true });

                if (error) throw error;
                setEvents(data || []);
            } catch (err) {
                console.error('Error fetching analytics:', err);
            } finally {
                setLoading(false);
            }
        };

        if (shopId) fetchAnalytics();
    }, [shopId, period]);

    const stats = useMemo(() => {
        const dailyMap: Record<string, DailyStat> = {};
        
        // Fill in missing days
        const days = period === 'daily' ? 7 : period === 'weekly' ? 30 : 90;
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            dailyMap[dateStr] = { date: dateStr, impressions: 0, actions: 0, engagement: 0 };
        }

        events.forEach(event => {
            const dateStr = event.created_at.split('T')[0];
            if (!dailyMap[dateStr]) return;

            if (event.event_type.includes('impression')) {
                dailyMap[dateStr].impressions++;
            } else if (event.event_type === 'action_click' || event.event_type === 'map_view' || event.event_type === 'reservation_click' || event.event_type === 'sns_click') {
                dailyMap[dateStr].actions++;
            } else if (event.event_type === 'like_click' || event.event_type === 'comment_click') {
                dailyMap[dateStr].engagement++;
            }
        });

        return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    }, [events, period]);

    const kpis = useMemo(() => {
        const totalImpressions = events.filter(e => e.event_type.includes('impression')).length;
        const totalActions = events.filter(e => ['action_click', 'map_view', 'reservation_click', 'sns_click'].includes(e.event_type)).length;
        const totalEngagement = events.filter(e => ['like_click', 'comment_click'].includes(e.event_type)).length;
        
        return [
            { id: 'impressions', label: 'Impressions', value: totalImpressions, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { id: 'actions', label: 'Actions', value: totalActions, color: 'text-pink-500', bg: 'bg-pink-500/10' },
            { id: 'engagement', label: 'Engagement', value: totalEngagement, color: 'text-purple-500', bg: 'bg-purple-500/10' }
        ];
    }, [events]);

    if (loading) return <LoadingScreen />;

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black tracking-tight mb-2 uppercase">Analytics</h1>
                    <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Store performance & audience engagement</p>
                </div>
                <div className="flex bg-zinc-900/50 p-1.5 rounded-2xl border border-white/5">
                    {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                period === p ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {kpis.map((kpi) => (
                    <button
                        key={kpi.id}
                        onClick={() => setActiveMetric(kpi.id as any)}
                        className={`p-8 rounded-[2rem] border transition-all text-left group relative overflow-hidden ${
                            activeMetric === kpi.id 
                            ? 'bg-zinc-900 border-white/10 shadow-2xl scale-[1.02]' 
                            : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-900/60'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-2xl ${kpi.bg} flex items-center justify-center text-xl mb-6 group-hover:scale-110 transition-transform`}>
                            {kpi.id === 'impressions' ? '👁️' : kpi.id === 'actions' ? '⚡' : '❤️'}
                        </div>
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{kpi.label}</p>
                        <p className="text-4xl font-black tracking-tighter">{kpi.value.toLocaleString()}</p>
                        
                        {activeMetric === kpi.id && (
                            <div className="absolute top-4 right-4 animate-in zoom-in duration-300">
                                <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_10px_#ec4899]" />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Chart Card */}
            <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.3em] mb-1">Growth Trend</h2>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Metric: {activeMetric}</p>
                    </div>
                </div>

                <div className="h-80 w-full relative">
                    <PremiumChart data={stats} metric={activeMetric} />
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden">
                <div className="p-8 border-b border-white/5">
                    <h2 className="text-sm font-black uppercase tracking-[0.3em]">Detailed Daily Data</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Date</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Impressions</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Actions</th>
                                <th className="px-8 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Engagement</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {[...stats].reverse().slice(0, 10).map((row) => (
                                <tr key={row.date} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-5 font-mono text-xs text-zinc-400">{row.date}</td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="text-xs font-bold">{row.impressions}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-xs font-bold text-pink-500">{row.actions}</td>
                                    <td className="px-8 py-5 text-xs font-bold text-purple-500">{row.engagement}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

