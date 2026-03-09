'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopNav from '../../components/TopNav';
import BottomNav from '../../components/BottomNav';
import { supabase } from '../../../lib/supabase';
import { t } from '../../../lib/i18n';

export default function CreateEvent() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [viewerLanguage, setViewerLanguage] = useState<string | null>('英語');
    const [userId, setUserId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        place: '',
        location: '',
        date: '',
        fee: '',
        contact_phone: '',
        description: '',
        media_url: '' // We will keep this as a text input for now, could be upgraded to upload later
    });

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const { data: userData } = await supabase
                    .from('users')
                    .select('language')
                    .eq('id', user.id)
                    .single();
                if (userData?.language) {
                    setViewerLanguage(userData.language);
                }
            } else {
                router.push('/login');
            }
        };
        fetchUser();
    }, [router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        setLoading(true);

        try {
            const { error } = await supabase.from('events').insert([
                {
                    user_id: userId,
                    title: formData.title,
                    place: formData.place,
                    location: formData.location,
                    date: formData.date,
                    fee: formData.fee,
                    contact_phone: formData.contact_phone,
                    description: formData.description,
                    image_url: formData.media_url // Mapping to existing image_url column or media_url
                }
            ]);

            if (error) throw error;
            router.push('/events');
            router.refresh();
        } catch (err: any) {
            console.error('Error creating event:', err);
            alert(err.message || 'Failed to create event. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-black min-h-screen text-white">
            <TopNav />
            <main className="pt-24 pb-24 px-4 max-w-md mx-auto relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-black tracking-wider uppercase">Host an Event</h1>
                    <div className="w-10"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Event Title *</label>
                        <input
                            type="text"
                            name="title"
                            required
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g., Summer Night DJ Party"
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Date & Time *</label>
                            <input
                                type="datetime-local"
                                name="date"
                                required
                                value={formData.date}
                                onChange={handleChange}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Entry Fee</label>
                            <input
                                type="text"
                                name="fee"
                                value={formData.fee}
                                onChange={handleChange}
                                placeholder="e.g., $20 or Free"
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Place Name *</label>
                        <input
                            type="text"
                            name="place"
                            required
                            value={formData.place}
                            onChange={handleChange}
                            placeholder="e.g., Club XYZ"
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Address/Location *</label>
                        <input
                            type="text"
                            name="location"
                            required
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="Full address or area"
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Contact Phone</label>
                        <input
                            type="tel"
                            name="contact_phone"
                            value={formData.contact_phone}
                            onChange={handleChange}
                            placeholder="+XX XXXXXXXX"
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Image URL</label>
                        <input
                            type="url"
                            name="media_url"
                            value={formData.media_url}
                            onChange={handleChange}
                            placeholder="https://example.com/image.jpg"
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Description *</label>
                        <textarea
                            name="description"
                            required
                            rows={4}
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Tell everyone what the event is about..."
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black tracking-widest text-sm transition-all active:scale-[0.98] shadow-lg shadow-pink-900/20 mt-8"
                    >
                        {loading ? 'POSTING...' : 'PUBLISH EVENT'}
                    </button>
                </form>
            </main>
            <BottomNav />
        </div>
    );
}
