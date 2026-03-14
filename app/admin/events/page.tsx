'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';
import SlideOver from '../components/SlideOver';
import EventForm from '../../components/EventForm';

export default function EventManagement() {
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .order('date', { ascending: true });
        
        if (error) console.error('Error fetching events:', error);
        else setEvents(data || []);
        setLoading(false);
    };

    const handleCreate = () => {
        setSelectedEvent(null);
        setIsModalOpen(true);
    };

    const handleEdit = (event: any) => {
        setSelectedEvent(event);
        setIsModalOpen(true);
    };

    const handleSuccess = () => {
        setIsModalOpen(false);
        setIsSaving(false);
        fetchEvents();
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setDeletingId(null);
            fetchEvents();
        } catch (err) {
            console.error('Error deleting event:', err);
            alert('Failed to delete event.');
        }
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black">Scheduled Events</h2>
                <div className="flex gap-4">
                    <button 
                        onClick={handleCreate}
                        className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-2xl text-[10px] font-black tracking-widest transition-all"
                    >
                        + CREATE EVENT
                    </button>
                    <button 
                        onClick={fetchEvents} 
                        className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
                        title="Refresh List"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-180 transition-transform duration-500">
                            <path d="M23 4v6h-6" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {events.map((event) => (
                    <div key={event.id} className="bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-xl flex flex-col group">
                        <div className="h-40 relative bg-zinc-800 flex items-center justify-center">
                            {event.image_url ? (
                                <img src={event.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            ) : (
                                <div className="text-zinc-700">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-20">
                                        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                        <circle cx="9" cy="9" r="2" />
                                        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                    </svg>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
                            <div className="absolute bottom-4 left-6 pr-6">
                                <p className="text-xs font-black text-pink-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    {new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    {event.status === 'cancelled' && (
                                        <span className="bg-red-500 text-white text-[8px] px-2 py-0.5 rounded-full">CANCELLED</span>
                                    )}
                                </p>
                                <h3 className="font-black text-white truncate">{event.title}</h3>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-2 text-xs text-zinc-400 font-bold truncate">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                    {event.place}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-zinc-400 font-bold">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500">
                                        <line x1="12" y1="2" x2="12" y2="22" />
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                    </svg>
                                    {event.fee || 'Free'}
                                </div>
                            </div>
                             <div className="mt-auto flex justify-end gap-3">
                                <button 
                                    onClick={() => handleEdit(event)}
                                    className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center transition-all group"
                                    title="Edit Event"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 group-hover:text-white transition-colors">
                                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                    </svg>
                                </button>
                                {deletingId === event.id ? (
                                    <div className="flex items-center gap-2 animate-in zoom-in-95 duration-200">
                                        <button 
                                            onClick={() => setDeletingId(null)}
                                            className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-black tracking-widest text-zinc-400 transition-all uppercase"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(event.id)}
                                            className="px-3 py-2 bg-red-500 hover:bg-red-600 rounded-lg text-[8px] font-black tracking-widest text-white transition-all uppercase shadow-lg shadow-red-900/40"
                                        >
                                            Confirm Delete
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setDeletingId(event.id)}
                                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all group bg-red-500/10 hover:bg-red-500/20 text-red-500"
                                        title="Delete Event"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
                                            <line x1="18" y1="6" x2="6" y2="18" />
                                            <line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {events.length === 0 && (
                <div className="py-20 text-center bg-zinc-900/20 rounded-3xl border border-dashed border-white/5">
                    <p className="text-zinc-500 font-bold italic">No events found.</p>
                </div>
            )}

            <SlideOver
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedEvent ? 'Edit Event' : 'Create New Event'}
                onSave={() => {
                    const form = document.getElementById('event-form') as HTMLFormElement;
                    if (form) form.requestSubmit();
                }}
                saveLabel={selectedEvent ? 'UPDATE EVENT' : 'PUBLISH EVENT'}
                isSaving={isSaving}
            >
                <EventForm 
                    initialData={selectedEvent} 
                    onSuccess={handleSuccess}
                    isModal={true}
                />
            </SlideOver>
        </div>
    );
}
