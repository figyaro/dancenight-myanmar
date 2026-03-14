'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

interface Event {
    id: string;
    shop_id: string;
    title: string;
    description: string;
    date: string;
    place: string;
    location: string;
    image_url: string;
    fee: string;
    contact_phone: string;
    status: string;
    created_at: string;
}

const EditIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);

const TrashIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
);

export default function ShopEventManagement() {
    const { shopId } = useParams();
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (shopId) fetchEvents();
    }, [shopId]);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('shop_id', shopId);
            
            if (error) throw error;
            setEvents(data || []);
        } catch (err: any) {
            console.error('Error fetching events:', err);
            setError('Failed to load events.');
        } finally {
            setLoading(false);
        }
    };

    const sortedEvents = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const upcoming = events
            .filter(e => new Date(e.date) >= now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const past = events
            .filter(e => new Date(e.date) < now)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return [...upcoming, ...past];
    }, [events]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setMediaPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        setError(null);

        try {
            let image_url = editingEvent?.image_url || '';

            // Handle image upload if new file
            if (mediaFile) {
                const { uploadMedia } = await import('../../../../lib/media-upload');
                const { url, error: uploadError } = await uploadMedia(mediaFile, `events/${shopId}`);

                if (uploadError) throw new Error(`Upload failed: ${uploadError}`);
                image_url = url;
            }

            const eventData = {
                shop_id: shopId as string,
                title: editingEvent?.title || '',
                description: editingEvent?.description || '',
                date: editingEvent?.date || new Date().toISOString(),
                place: editingEvent?.place || '',
                location: editingEvent?.location || '',
                fee: editingEvent?.fee || 'Free',
                contact_phone: editingEvent?.contact_phone || '',
                image_url: image_url,
                status: editingEvent?.status || 'published'
            };

            let result;
            if (editingEvent?.id) {
                result = await supabase
                    .from('events')
                    .update(eventData)
                    .eq('id', editingEvent.id);
            } else {
                result = await supabase
                    .from('events')
                    .insert([eventData]);
            }

            if (result.error) throw result.error;

            setIsModalOpen(false);
            setEditingEvent(null);
            setMediaFile(null);
            setMediaPreview(null);
            fetchEvents();
        } catch (err: any) {
            console.error('Submission error:', err);
            setError(err.message || 'Failed to save event.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteEvent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this event?')) return;
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchEvents();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const openAddModal = () => {
        setEditingEvent({ 
            title: '', 
            description: '', 
            date: new Date().toISOString().split('T')[0], 
            place: '', 
            location: '', 
            fee: 'Free', 
            contact_phone: '',
            status: 'published' 
        });
        setMediaFile(null);
        setMediaPreview(null);
        setIsModalOpen(true);
    };

    const openEditModal = (event: Event) => {
        setEditingEvent({ ...event });
        setMediaPreview(event.image_url);
        setMediaFile(null);
        setIsModalOpen(true);
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Area */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter">Event Management</h2>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Create and manage your shop's exclusive events</p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-2xl text-xs font-black tracking-widest shadow-lg shadow-pink-900/20 transition-all active:scale-95 group"
                >
                    <span className="text-lg group-hover:rotate-90 transition-transform">+</span>
                    CREATE EVENT
                </button>
            </div>

            {/* Event List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {sortedEvents.map((event: Event) => {
                    const isPast = new Date(event.date) < new Date(new Date().setHours(0,0,0,0));
                    return (
                        <div key={event.id} className={`group bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-pink-500/30 transition-all duration-700 backdrop-blur-3xl flex flex-col ${isPast ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' : ''}`}>
                            <div className="aspect-[16/10] relative overflow-hidden">
                                {event.image_url ? (
                                    <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                ) : (
                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-500 italic text-[10px] font-black uppercase tracking-widest">No Poster</div>
                                )}
                                
                                <div className="absolute top-6 left-6 flex flex-col gap-2">
                                    <div className="px-4 py-1.5 bg-black/60 backdrop-blur-xl rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border border-white/10 w-fit">
                                        {event.status}
                                    </div>
                                    {isPast && (
                                        <div className="px-4 py-1.5 bg-zinc-800/80 backdrop-blur-xl rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border border-white/10 w-fit text-zinc-400">
                                            EVENT PASSED
                                        </div>
                                    )}
                                </div>
                                
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                                
                                <div className="absolute bottom-6 left-6 right-6">
                                    <p className="text-[10px] font-black text-pink-500 uppercase tracking-[0.3em] mb-2 drop-shadow-2xl">
                                        {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                    <h3 className="text-2xl font-black tracking-tighter line-clamp-1 truncate drop-shadow-2xl">{event.title}</h3>
                                </div>
                            </div>
                            
                            <div className="p-8 flex-1 flex flex-col">
                                <p className="text-zinc-500 text-xs line-clamp-2 font-bold mb-8 leading-relaxed">
                                    {event.description || 'Elevate your night with our premium experience.'}
                                </p>
                                
                                <div className="space-y-4 mb-10 flex-1">
                                    <div className="flex items-center gap-4 text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm">📍</div>
                                        <span className="truncate">{event.place || event.location || 'VENUE TBD'}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] text-zinc-400 font-black uppercase tracking-widest">
                                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm">💰</div>
                                        <span>{event.fee || 'FREE ENTRANCE'}</span>
                                    </div>
                                </div>
                                
                                <div className="flex gap-4 pt-6 border-t border-white/5">
                                    <button 
                                        onClick={() => openEditModal(event)}
                                        className="flex-1 h-14 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2 border border-white/5 group/btn"
                                    >
                                        <div className="group-hover/btn:rotate-12 transition-transform"><EditIcon /></div>
                                        EDIT
                                    </button>
                                    <button 
                                        onClick={() => deleteEvent(event.id)}
                                        className="w-14 h-14 bg-red-500/5 hover:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500/40 hover:text-red-500 transition-all border border-red-500/10 hover:border-red-500/20"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {events.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🎫</div>
                    <p className="text-zinc-500 font-bold italic">No events posted yet. Reach your customers with exciting news!</p>
                </div>
            )}

            {/* Sliding Drawer Modal */}
            <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isModalOpen ? 'visible' : 'invisible'}`}>
                <div 
                    className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500 ${isModalOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => !isSubmitting && setIsModalOpen(false)}
                />

                <div className={`absolute top-0 right-0 h-full w-full max-w-lg bg-zinc-950 border-l border-white/5 shadow-2xl transition-transform duration-500 ease-out p-10 flex flex-col ${isModalOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-2xl font-black tracking-tighter uppercase">{editingEvent?.id ? 'Edit' : 'Create'} Event</h2>
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all"
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar pb-10">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold p-4 rounded-2xl">
                                {error}
                            </div>
                        )}

                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-video bg-zinc-900 rounded-3xl border-2 border-dashed border-white/5 hover:border-pink-500/30 transition-all cursor-pointer overflow-hidden relative group"
                        >
                            {mediaPreview ? (
                                <img src={mediaPreview} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🖼️</div>
                                    <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Upload Event Poster</span>
                                </div>
                            )}
                            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Event Title</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Grand Opening Party"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                    value={editingEvent?.title || ''}
                                    onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Description</label>
                                <textarea 
                                    placeholder="Tell people what's happening..."
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors min-h-[120px] resize-none"
                                    value={editingEvent?.description || ''}
                                    onChange={(e) => setEditingEvent({...editingEvent, description: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Event Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                        value={editingEvent?.date ? new Date(editingEvent.date).toISOString().split('T')[0] : ''}
                                        onChange={(e) => setEditingEvent({...editingEvent, date: e.target.value})}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Entry Fee</label>
                                    <input 
                                        type="text" 
                                        placeholder="Free / 20,000 MMK"
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                        value={editingEvent?.fee || ''}
                                        onChange={(e) => setEditingEvent({...editingEvent, fee: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Venue / Place</label>
                                    <input 
                                        type="text" 
                                        placeholder="Stage Lounge"
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                        value={editingEvent?.place || ''}
                                        onChange={(e) => setEditingEvent({...editingEvent, place: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Contact Phone</label>
                                    <input 
                                        type="text" 
                                        placeholder="09-xxxxxxx"
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                        value={editingEvent?.contact_phone || ''}
                                        onChange={(e) => setEditingEvent({...editingEvent, contact_phone: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Status</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['published', 'draft', 'cancelled'].map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setEditingEvent({...editingEvent, status})}
                                            className={`py-3 rounded-xl text-[10px] font-black tracking-widest uppercase border transition-all ${editingEvent?.status === status ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'}`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase shadow-2xl shadow-pink-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isSubmitting ? 'SAVING...' : (editingEvent?.id ? 'UPDATE EVENT' : 'POST EVENT')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}
