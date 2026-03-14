'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { t } from '../../../lib/i18n';
import TopNav from '../../components/TopNav';
import BottomNav from '../../components/BottomNav';

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

export default function EventDetail() {
    const params = useParams();
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState<string | null>('英語');
    const [isJoining, setIsJoining] = useState(false);
    const [hasJoined, setHasJoined] = useState(false);

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

                // Fetch event
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .eq('id', params.id)
                    .single();

                if (error) throw error;
                setEvent(data);
            } catch (err) {
                console.error('Error fetching event:', err);
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchData();
        }
    }, [params.id]);

    const handleJoin = () => {
        setIsJoining(true);
        // Simulate joining
        setTimeout(() => {
            setIsJoining(false);
            setHasJoined(true);
        }, 1500);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(language === '日本語' ? 'ja-JP' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString(language === '日本語' ? 'ja-JP' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="bg-black min-h-screen flex items-center justify-center">
                <div className="animate-spin h-10 w-10 text-pink-500 border-4 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="bg-black min-h-screen text-white flex flex-col items-center justify-center p-10 text-center">
                <h1 className="text-2xl font-bold mb-4">Event not found</h1>
                <button onClick={() => router.back()} className="text-pink-500 font-bold hover:underline">Go back</button>
            </div>
        );
    }

    return (
        <div className="bg-black min-h-screen text-white pb-32">
            <TopNav />

            {/* Hero Image Section */}
            <div className="relative w-full h-[40vh] overflow-hidden">
                {event.image_url && event.image_url.trim() !== '' ? (
                    <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-800">
                         <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                        </svg>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                {/* Back Button Overlay */}
                <button
                    onClick={() => router.back()}
                    className="absolute top-6 left-6 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                </button>
            </div>

            <main className="max-w-md mx-auto px-6 -mt-16 relative z-10">
                {/* Event Summary Card */}
                <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl mb-8">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-pink-500/20 text-pink-500 rounded-full text-[10px] font-black tracking-widest uppercase">
                            Upcoming Event
                        </span>
                        {event.fee && (
                            <span className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-[10px] font-black tracking-widest uppercase">
                                {event.fee}
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-black mb-6 leading-tight tracking-tight">
                        {event.title}
                    </h1>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-pink-500">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Date</p>
                                <p className="text-sm font-bold text-zinc-100">{formatDate(event.date)}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-pink-500">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Time</p>
                                <p className="text-sm font-bold text-zinc-100">{formatTime(event.date)} ~</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-pink-500">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Venue</p>
                                <p className="text-sm font-bold text-zinc-100 truncate">{event.place}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* About Section */}
                <section className="mb-10">
                    <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-pink-600 rounded-full" />
                        About Event
                    </h2>
                    <div className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                        {event.description}
                    </div>
                </section>

                {/* Location Map Section */}
                <section className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-black flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-pink-600 rounded-full" />
                            Location
                        </h2>
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location + ' ' + event.place)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-black text-pink-500 uppercase tracking-widest hover:underline"
                        >
                            Open in Maps
                        </a>
                    </div>
                    <p className="text-zinc-400 text-xs mb-4 flex items-start gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                        {event.location}
                    </p>
                    <div className="w-full h-56 rounded-3xl overflow-hidden border border-white/5 bg-zinc-900 group relative">
                        {/* Google Maps Embed (No API key required for basic embed, using search view) */}
                        <iframe
                            width="100%"
                            height="100%"
                            style={{ border: 0, filter: 'grayscale(1) invert(1) contrast(1.2)' }}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={`https://www.google.com/maps?q=${encodeURIComponent(event.location + ' ' + event.place)}&output=embed`}
                        ></iframe>
                        <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-3xl" />
                    </div>
                </section>

                {/* Contact Section */}
                {event.contact_phone && (
                    <section className="mb-10">
                        <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-pink-600 rounded-full" />
                            Organizer Contact
                        </h2>
                        <a
                            href={`tel:${event.contact_phone}`}
                            className="flex items-center justify-between p-4 bg-zinc-900 rounded-2xl border border-white/5 active:scale-95 transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                </div>
                                <span className="font-bold text-zinc-300">Contact via Phone</span>
                            </div>
                            <span className="text-sm font-black text-pink-500">{event.contact_phone}</span>
                        </a>
                    </section>
                )}
            </main>

            {/* Sticky Action Button */}
            <div className="fixed bottom-0 left-0 right-0 p-6 z-[100] bg-gradient-to-t from-black via-black/90 to-transparent">
                <div className="max-w-md mx-auto">
                    <button
                        onClick={handleJoin}
                        disabled={isJoining || hasJoined}
                        className={`w-full py-4 rounded-3xl font-black tracking-[0.2em] uppercase text-sm shadow-2xl transition-all active:scale-95 overflow-hidden relative group
                            ${hasJoined
                                ? 'bg-zinc-800 text-zinc-500 cursor-default'
                                : 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-900/40 hover:shadow-pink-500/40'
                            }`}
                    >
                        {isJoining ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" />
                                <span>Joining...</span>
                            </div>
                        ) : hasJoined ? (
                            <div className="flex items-center justify-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                <span>Joined</span>
                            </div>
                        ) : (
                            <span>Join Event</span>
                        )}

                        {!hasJoined && !isJoining && (
                            <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]" />
                        )}
                    </button>
                </div>
            </div>

            <BottomNav />
        </div>
    );
}
