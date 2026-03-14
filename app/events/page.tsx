'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { t } from '../../lib/i18n';
import LoadingScreen from '../components/LoadingScreen';
import TopNav from '../components/TopNav';
import BottomNav from '../components/BottomNav';
import Link from 'next/link';

interface Event {
    id: string;
    title: string;
    description: string;
    date: string;
    place: string;
    location: string;
    image_url: string;
    fee: string;
    contact_phone: string;
    user_id: string;
    status: string;
}

export default function Events() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState<string | null>('英語');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'All' | 'Today' | 'Newest' | 'Recommended'>('All');
    const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('language')
                        .eq('id', user.id)
                        .single();
                    if (userData?.language) {
                        setLanguage(userData.language);
                    }
                }

                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .order('date', { ascending: true });

                if (error) throw error;
                setEvents(data || []);
            } catch (err) {
                console.error('Error fetching events:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatDate = (dateString: string, format: 'short' | 'long' = 'long') => {
        const date = new Date(dateString);
        if (format === 'short') {
            return date.toLocaleDateString(language === '日本語' ? 'ja-JP' : 'en-US', {
                month: 'short',
                day: 'numeric'
            });
        }
        return date.toLocaleDateString(language === '日本語' ? 'ja-JP' : 'en-US', {
            month: 'short', day: 'numeric', weekday: 'short'
        });
    };

    const sortedGroups = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let filtered = events.filter(e => e.status !== 'cancelled');

        // Apply Search
        if (searchQuery) {
            filtered = filtered.filter(e =>
                e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.place?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply Logic Filters
        if (activeFilter === 'Today') {
            filtered = filtered.filter(e => new Date(e.date).toDateString() === now.toDateString());
        } else if (activeFilter === 'Newest') {
            // Logic for newest is usually arrival in DB, but we sort by date anyway
        }

        const upcoming = filtered
            .filter(e => new Date(e.date) >= now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const past = filtered
            .filter(e => new Date(e.date) < now)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            featured: upcoming.slice(0, 5), // Take up to 5 for slider
            upcoming: upcoming.slice(upcoming.length > 5 ? 5 : (upcoming.length > 0 ? 1 : 0)),
            past: past
        };
    }, [events, searchQuery, activeFilter]);

    // Hero Slider Auto-scroll
    useEffect(() => {
        if (sortedGroups.featured.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentHeroIndex((prev) => (prev + 1) % sortedGroups.featured.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [sortedGroups.featured.length]);

    return (
        <div className="bg-black min-h-screen text-white pb-32">
            <TopNav />

            <main className="animate-in fade-in duration-1000 pt-20">
                {/* Hero Slider Section */}
                {sortedGroups.featured.length > 0 ? (
                    <div className="relative h-[65vh] w-full overflow-hidden group">
                        {sortedGroups.featured.map((event, idx) => (
                            <div
                                key={event.id}
                                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentHeroIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                            >
                                <div className="absolute inset-0 overflow-hidden">
                                    {event.image_url && event.image_url.trim() !== '' ? (
                                        <img
                                            src={event.image_url}
                                            alt=""
                                            className="w-full h-full object-cover scale-105 blur-2xl opacity-20"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-900/40 blur-2xl opacity-20" />
                                    )}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />

                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 max-w-lg mx-auto">
                                    <Link href={`/events/${event.id}`} className="w-full group/card transition-transform duration-700 hover:scale-[1.02]">
                                        <div className="relative aspect-[4/5] md:aspect-[4/3] w-full rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 flex items-center justify-center bg-zinc-900">
                                            {event.image_url && event.image_url.trim() !== '' ? (
                                                <img src={event.image_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-800 opacity-50">
                                                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                                    <circle cx="9" cy="9" r="2" />
                                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                                </svg>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                                            
                                            <div className="absolute inset-0 flex flex-col justify-end p-8 text-center">
                                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-pink-500/20 border border-pink-500/30 rounded-full mb-4 self-center backdrop-blur-md">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-400">Featured</span>
                                                </div>
                                                
                                                <h1 className="text-2xl md:text-4xl font-black tracking-tighter mb-4 leading-tight uppercase text-white drop-shadow-2xl">
                                                    {event.title}
                                                </h1>
                                                
                                                <div className="flex items-center justify-center gap-4 text-zinc-300 text-[10px] font-bold uppercase tracking-widest mb-6 px-4">
                                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500">
                                                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                                                            <line x1="16" y1="2" x2="16" y2="6"/>
                                                            <line x1="8" y1="2" x2="8" y2="6"/>
                                                            <line x1="3" y1="10" x2="21" y2="10"/>
                                                        </svg>
                                                        {formatDate(event.date)}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-zinc-400">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                                                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                                                            <circle cx="12" cy="10" r="3"/>
                                                        </svg>
                                                        <span className="truncate max-w-[120px]">{event.place}</span>
                                                    </div>
                                                </div>

                                                <div className="self-center px-8 py-3 bg-white text-black font-black text-[10px] rounded-2xl uppercase tracking-[0.2em] shadow-2xl transition-all group-hover/card:bg-pink-500 group-hover/card:text-white">
                                                    EXPLORE EXPERIENCE
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            </div>
                        ))}

                        {/* Slider Indicators */}
                        {sortedGroups.featured.length > 1 && (
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                                {sortedGroups.featured.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentHeroIndex(idx)}
                                        className={`h-1 rounded-full transition-all duration-500 ${idx === currentHeroIndex ? 'w-8 bg-pink-500' : 'w-2 bg-white/20'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="pt-24 px-6 text-center">
                        <h1 className="text-4xl font-black uppercase tracking-tighter opacity-20">No Events</h1>
                    </div>
                )}

                {/* Filter & Search Bar */}
                <div className="px-6 max-w-lg mx-auto mt-8 relative z-10 space-y-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search events, places, vibes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-900/60 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold focus:outline-none focus:border-pink-500/50 transition-all placeholder:text-zinc-600"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                            </svg>
                        </span>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                        {['All', 'Today', 'Newest', 'Recommended'].map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter as any)}
                                className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                                    activeFilter === filter
                                    ? 'bg-pink-500 border-pink-500 text-white shadow-lg shadow-pink-500/20'
                                    : 'bg-zinc-900/40 border-white/5 text-zinc-400 hover:border-white/10'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="px-6 max-w-lg mx-auto mt-12 relative z-10">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h2 className="text-xs font-black uppercase tracking-[0.4em] text-zinc-500 mb-1">Discover</h2>
                            <h3 className="text-3xl font-black uppercase tracking-tighter">
                                {searchQuery ? 'Search Results' : 'Next Experiences'}
                            </h3>
                        </div>
                        <Link href="/events/new" className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl flex items-center justify-center text-xl transition-all active:scale-90 shadow-xl">
                            +
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {/* Upcoming List */}
                            <section>
                                <div className="grid grid-cols-1 gap-6">
                                    {sortedGroups.upcoming.map((event: Event) => (
                                        <Link key={event.id} href={`/events/${event.id}`}>
                                            <div className="group bg-zinc-900/40 border border-white/5 rounded-3xl p-5 backdrop-blur-3xl hover:border-white/10 transition-all duration-500 flex gap-5 active:scale-95">
                                                <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-white/5 bg-zinc-950 flex items-center justify-center">
                                                    {event.image_url && event.image_url.trim() !== '' ? (
                                                        <img src={event.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                    ) : (
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-800">
                                                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                                            <circle cx="9" cy="9" r="2" />
                                                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="flex-1 py-1 flex flex-col justify-between overflow-hidden">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1.5">
                                                            <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">{formatDate(event.date, 'short')}</span>
                                                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest truncate">{event.place}</span>
                                                        </div>
                                                        <h4 className="text-lg font-black leading-tight mb-2 line-clamp-1">{event.title}</h4>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">{event.fee}</span>
                                                        <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">➔</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </section>

                            {/* Past Section (Only show if not searching) */}
                            {!searchQuery && sortedGroups.past.length > 0 && (
                                <section className="opacity-40">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="h-px flex-1 bg-white/5" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-500">History</h3>
                                        <div className="h-px flex-1 bg-white/5" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {sortedGroups.past.slice(0, 4).map((event: Event) => (
                                            <Link key={event.id} href={`/events/${event.id}`}>
                                                <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-3 grayscale hover:grayscale-0 transition-all">
                                                    <div className="w-full aspect-square rounded-xl mb-3 overflow-hidden bg-zinc-950 flex items-center justify-center">
                                                        {event.image_url && event.image_url.trim() !== '' ? (
                                                            <img src={event.image_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-800">
                                                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                                                <circle cx="9" cy="9" r="2" />
                                                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">{formatDate(event.date, 'short')}</p>
                                                    <h5 className="text-[10px] font-bold line-clamp-1">{event.title}</h5>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {sortedGroups.upcoming.length === 0 && (
                                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                                    <p className="text-zinc-500 font-bold italic text-sm">No experiences found match your vibe.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
            <BottomNav />
        </div>
    );
}
