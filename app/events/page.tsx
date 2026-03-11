'use client';

import { useState, useEffect } from 'react';
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
}

export default function Events() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState<string | null>('英語');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch language
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

                // Fetch events
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(language === '日本語' ? 'ja-JP' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            weekday: 'short'
        });
    };

    return (
        <div className="bg-black min-h-screen text-white">
            <TopNav />
            <main className="pt-20 pb-24 px-4 max-w-md mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-black">{t('events', language)}</h1>
                    <Link href="/events/new" className="px-4 py-2 bg-pink-600 hover:bg-pink-500 rounded-full text-xs font-black tracking-widest text-white shadow-lg shadow-pink-900/20 transition-all active:scale-95">
                        + HOST
                    </Link>
                </div>

                {loading ? (
                    <LoadingScreen fullScreen={false} />
                ) : events.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500">
                        <p>No events found.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {events.map((event) => (
                            <Link key={event.id} href={`/events/${event.id}`}>
                                <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 transition-transform active:scale-[0.98]">
                                    {event.image_url ? (
                                        <img src={event.image_url} alt={event.title} className="w-full h-48 object-cover" />
                                    ) : (
                                        <div className="w-full h-48 bg-zinc-800 flex items-center justify-center text-zinc-600">
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                <line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <div className="text-pink-500 text-sm font-bold mb-1">
                                            {formatDate(event.date)}
                                        </div>
                                        <h2 className="text-xl font-bold mb-2">{event.title}</h2>
                                        <p className="text-zinc-400 text-sm mb-3 line-clamp-2">{event.description}</p>

                                        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/5">
                                            <div className="flex items-center text-zinc-300 text-xs text-zinc-400">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 text-pink-500">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                    <circle cx="12" cy="10" r="3" />
                                                </svg>
                                                <span className="font-bold mr-1 text-zinc-300">{event.place}</span> ({event.location})
                                            </div>
                                            {event.fee && (
                                                <div className="flex items-center text-zinc-300 text-xs text-green-400/90 font-bold">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2">
                                                        <rect x="2" y="6" width="20" height="12" rx="2" />
                                                        <circle cx="12" cy="12" r="2" />
                                                        <path d="M6 12h.01M18 12h.01" />
                                                    </svg>
                                                    {event.fee}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
            <BottomNav />
        </div>
    );
}

