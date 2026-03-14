'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface EventFormProps {
    initialData?: any;
    onSuccess: (id?: string) => void;
    onCancel?: () => void;
    isModal?: boolean;
}

export default function EventForm({ initialData, onSuccess, onCancel, isModal = false }: EventFormProps) {
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        place: '',
        location: '',
        date: '',
        fee: '',
        contact_phone: '',
        description: '',
        media_url: ''
    });

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
            }
        };
        fetchUser();

        if (initialData) {
            const formattedDate = initialData.date ? new Date(initialData.date).toISOString().slice(0, 16) : '';
            setFormData({
                title: initialData.title || '',
                place: initialData.place || '',
                location: initialData.location || '',
                date: formattedDate,
                fee: initialData.fee || '',
                contact_phone: initialData.contact_phone || '',
                description: initialData.description || '',
                media_url: initialData.image_url || ''
            });
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        try {
            const { uploadMedia } = await import('../../lib/media-upload');
            const { url, error } = await uploadMedia(file, 'events');

            if (error) throw new Error(error);
            setFormData({ ...formData, media_url: url });
        } catch (error: any) {
            alert('Error uploading image: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId && !initialData?.user_id) return;
        setLoading(true);

        try {
            const eventPayload = {
                user_id: userId || initialData?.user_id,
                title: formData.title,
                place: formData.place,
                location: formData.location,
                date: formData.date,
                fee: formData.fee,
                contact_phone: formData.contact_phone,
                description: formData.description,
                image_url: formData.media_url
            };

            const { data, error } = initialData?.id
                ? await supabase.from('events').update(eventPayload).eq('id', initialData.id).select().single()
                : await supabase.from('events').insert([eventPayload]).select().single();

            if (error) throw error;
            onSuccess(data?.id);
        } catch (err: any) {
            console.error('Error saving event:', err);
            alert(err.message || 'Failed to save event. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form id="event-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Event Main Image</label>
                <div className="relative aspect-video w-full rounded-2xl bg-zinc-950/50 border border-white/10 overflow-hidden group cursor-pointer shadow-inner">
                    {formData.media_url ? (
                        <img src={formData.media_url} key={formData.media_url} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Event Preview" />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-xl">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                    <circle cx="9" cy="9" r="2" />
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                </svg>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Upload Event Photo</span>
                        </div>
                    )}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-all backdrop-blur-sm">
                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Choose File</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={loading} />
                    </label>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Event Title *</label>
                <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., Summer Night DJ Party"
                    className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Date & Time *</label>
                    <input
                        type="datetime-local"
                        name="date"
                        required
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Entry Fee</label>
                    <input
                        type="text"
                        name="fee"
                        value={formData.fee}
                        onChange={handleChange}
                        placeholder="e.g., $20 or Free"
                        className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Place Name *</label>
                <input
                    type="text"
                    name="place"
                    required
                    value={formData.place}
                    onChange={handleChange}
                    placeholder="e.g., Club XYZ"
                    className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all"
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Address/Location *</label>
                <input
                    type="text"
                    name="location"
                    required
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="Full address or area"
                    className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all"
                />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Contact Phone</label>
                <input
                    type="tel"
                    name="contact_phone"
                    value={formData.contact_phone}
                    onChange={handleChange}
                    placeholder="+XX XXXXXXXX"
                    className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all"
                />
            </div>


            <div className="space-y-1">
                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">Description *</label>
                <textarea
                    name="description"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Tell everyone what the event is about..."
                    className="w-full bg-zinc-950/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all resize-none"
                />
            </div>

            {!isModal && (
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-pink-600 hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-black tracking-widest text-sm transition-all active:scale-[0.98] shadow-xl shadow-pink-900/20 mt-8"
                >
                    {loading ? 'SAVING...' : (initialData?.id ? 'UPDATE EVENT' : 'PUBLISH EVENT')}
                </button>
            )}

            {/* Hidden submit button to allow triggering from SlideOver footer */}
            <button type="submit" className="hidden" />
        </form>
    );
}
