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

        if (searchQuery) {
            filtered = filtered.filter(e =>
                e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.place?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (activeFilter === 'Today') {
            filtered = filtered.filter(e => new Date(e.date).toDateString() === now.toDateString());
        }

        const upcoming = filtered
            .filter(e => new Date(e.date) >= now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const past = filtered
            .filter(e => new Date(e.date) < now)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
            featured: upcoming.slice(0, 5),
            upcoming: upcoming.slice(upcoming.length > 5 ? 5 : (upcoming.length > 0 ? 1 : 0)),
            past: past
        };
    }, [events, searchQuery, activeFilter]);

    useEffect(() => {
        if (sortedGroups.featured.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentHeroIndex((prev) => (prev + 1) % sortedGroups.featured.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [sortedGroups.featured.length]);

    return (
        <div className="bg-[#050505] min-h-screen text-white pb-32 font-outfit">
            {/* Background Atmosphere */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-pink-500/10 blur-[120px] mix-blend-screen animate-pulse" />
                <div className="absolute top-[30%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[100px] mix-blend-screen" />
                <div className="absolute bottom-[-20%] left-[20%] w-[70%] h-[70%] rounded-full bg-purple-500/10 blur-[120px] mix-blend-screen animate-pulse" />
            </div>

            <TopNav />

            <main className="relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pt-20">
                {/* Cinematic Hero Slider */}
                {sortedGroups.featured.length > 0 ? (
                    <div className="relative h-[70vh] w-full overflow-hidden group">
                        {sortedGroups.featured.map((event, idx) => (
                            <div
                                key={event.id}
                                className={`absolute inset-0 transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) ${idx === currentHeroIndex ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 z-0'}`}
                            >
                                <div className="absolute inset-0">
                                    {event.image_url ? (
                                        <>
                                            <img src={event.image_url} alt="" className="w-full h-full object-cover brightness-75" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-black/20 to-transparent" />
                                            <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/80 via-transparent to-transparent" />
                                        </>
                                    ) : (
                                        <div className="w-full h-full bg-zinc-900" />
                                    )}
                                </div>
                                
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 max-w-2xl mx-auto text-center">
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full mb-6 animate-text-entry">
                                        <span className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_12px_#ec4899]" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Featured Experience</span>
                                    </div>
                                    
                                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-[1.1] uppercase text-white drop-shadow-2xl animate-text-entry [animation-delay:200ms]">
                                        {event.title}
                                    </h1>
                                    
                                    <div className="flex items-center justify-center gap-6 text-white/70 text-[11px] font-bold uppercase tracking-[0.2em] mb-8 animate-text-entry [animation-delay:400ms]">
                                        <div className="flex items-center gap-2">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-pink-500">
                                                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                                            </svg>
                                            {formatDate(event.date)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-500">
                                                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
                                            </svg>
                                            {event.place}
                                        </div>
                                    </div>

                                    <Link href={`/events/${event.id}`} className="px-10 py-4 bg-white text-black font-black text-[11px] rounded-full uppercase tracking-[0.3em] shadow-2xl transition-all hover:bg-pink-500 hover:text-white hover:scale-105 active:scale-95 animate-text-entry [animation-delay:600ms]">
                                        Explore Vibes
                                    </Link>
                                </div>
                            </div>
                        ))}

                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex gap-3">
                            {sortedGroups.featured.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentHeroIndex(idx)}
                                    className={`h-1.5 rounded-full transition-all duration-700 ${idx === currentHeroIndex ? 'w-12 bg-pink-500 shadow-[0_0_15px_#ec4899]' : 'w-3 bg-white/20'}`}
                                />
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* Filter & Search Bar */}
                <div className="px-6 max-w-lg mx-auto -mt-10 relative z-20">
                    <div className="liquid-glass p-1.5 flex flex-col gap-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search vibes, places, events..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold focus:outline-none placeholder:text-zinc-500 text-white"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                            </span>
                        </div>
                        
                        <div className="flex gap-1.5 overflow-x-auto p-1 scrollbar-hide no-scrollbar">
                            {['All', 'Today', 'Newest', 'Recommended'].map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter as any)}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                                        activeFilter === filter
                                        ? 'bg-pink-600 text-white shadow-lg'
                                        : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                                    }`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="px-6 max-w-lg mx-auto mt-16 relative z-10">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-pink-500 mb-2 block animate-text-entry">Experience</span>
                            <h3 className="text-4xl font-black uppercase tracking-tighter leading-none animate-text-entry [animation-delay:100ms]">
                                {searchQuery ? 'Results' : 'Upcoming'}
                            </h3>
                        </div>
                        <Link href="/events/new" className="w-14 h-14 bg-white/5 hover:bg-pink-500 hover:text-white border border-white/10 rounded-2xl flex items-center justify-center text-2xl transition-all active:scale-90 shadow-2xl backdrop-blur-3xl animate-text-entry [animation-delay:200ms]">
                            +
                        </Link>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-24">
                            <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-10">
                            {sortedGroups.upcoming.length > 0 ? (
                                sortedGroups.upcoming.map((event: Event, idx) => (
                                    <Link key={event.id} href={`/events/${event.id}`} className="group relative">
                                        <div className="relative aspect-[16/10] w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl mb-5">
                                            {event.image_url ? (
                                                <img src={event.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-900" />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                            
                                            <div className="absolute top-6 left-6 flex flex-col gap-2">
                                                <div className="px-4 py-1.5 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full inline-flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{formatDate(event.date, 'short')}</span>
                                                </div>
                                            </div>

                                            <div className="absolute top-6 right-6">
                                                <div className="px-4 py-1.5 bg-pink-600/90 backdrop-blur-xl rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                                                    {event.fee}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="px-2">
                                            <div className="flex items-center gap-3 mb-2 opacity-50">
                                                <span className="text-[10px] font-black uppercase tracking-widest">{event.place}</span>
                                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                                <span className="text-[10px] font-black uppercase tracking-widest truncate">{event.location}</span>
                                            </div>
                                            <h4 className="text-2xl font-black uppercase tracking-tight group-hover:text-pink-500 transition-colors leading-tight">
                                                {event.title}
                                            </h4>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="py-24 liquid-glass text-center border-dashed">
                                    <p className="text-zinc-500 font-black uppercase tracking-widest text-xs">No vibes found</p>
                                </div>
                            )}

                            {/* History Section */}
                            {!searchQuery && sortedGroups.past.length > 0 && (
                                <section className="mt-12">
                                    <div className="flex items-center gap-6 mb-10 opacity-30">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.6em] whitespace-nowrap">Past Events</h3>
                                        <div className="h-px w-full bg-white" />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 opacity-50">
                                        {sortedGroups.past.slice(0, 4).map((event: Event) => (
                                            <Link key={event.id} href={`/events/${event.id}`} className="group">
                                                <div className="rounded-3xl overflow-hidden aspect-square border border-white/5 bg-zinc-900 mb-3 grayscale group-hover:grayscale-0 transition-all">
                                                    {event.image_url && <img src={event.image_url} alt="" className="w-full h-full object-cover" />}
                                                </div>
                                                <span className="text-[8px] font-black uppercase tracking-widest block mb-1 opacity-50">{formatDate(event.date, 'short')}</span>
                                                <h5 className="text-[10px] font-black uppercase tracking-tight line-clamp-1">{event.title}</h5>
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}
                </div>
            </main>
            
            <BottomNav />
        </div>
    );
}
