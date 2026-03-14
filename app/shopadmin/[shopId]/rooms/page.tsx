'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

interface Room {
    id: string;
    shop_id: string;
    name: string;
    capacity: number;
    price_per_hour: number;
    description: string;
    image_url: string;
    status: string;
    tags: string[];
}

const ROOM_TAGS = [
    'Myanmar Song', 'Japanese Song', 'Korea Song', 'Chainese Song', 'English Song',
    'Bluetooth', 'DJ Booth', 'DJ Controller', 'Bass speaker', '4 Speake',
    'Laser Light', 'Room LED Light', 'Drink Beer', 'Eat Meal'
];

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

export default function RoomManagement() {
    const { shopId } = useParams();
    const router = useRouter();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [editingRoom, setEditingRoom] = useState<Partial<Room> | null>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (shopId) fetchRooms();
    }, [shopId]);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('shop_rooms')
                .select('*')
                .eq('shop_id', shopId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setRooms(data || []);
        } catch (err: any) {
            console.error('Error fetching rooms:', err);
            setError('Failed to load rooms.');
        } finally {
            setLoading(false);
        }
    };

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
            let image_url = editingRoom?.image_url || '';

            // Handle image upload if new file
            if (mediaFile) {
                const { uploadMedia } = await import('../../../../lib/media-upload');
                const { url, error: uploadError } = await uploadMedia(mediaFile, `rooms/${shopId}`);

                if (uploadError) throw new Error(`Upload failed: ${uploadError}`);
                image_url = url;
            }

            const roomData = {
                shop_id: shopId as string,
                name: editingRoom?.name || '',
                capacity: Number(editingRoom?.capacity) || 0,
                price_per_hour: Number(editingRoom?.price_per_hour) || 0,
                description: editingRoom?.description || '',
                image_url: image_url,
                status: editingRoom?.status || 'available',
                tags: editingRoom?.tags || []
            };

            let result;
            if (editingRoom?.id) {
                result = await supabase
                    .from('shop_rooms')
                    .update(roomData)
                    .eq('id', editingRoom.id);
            } else {
                result = await supabase
                    .from('shop_rooms')
                    .insert([roomData]);
            }

            if (result.error) throw result.error;

            setIsModalOpen(false);
            setEditingRoom(null);
            setMediaFile(null);
            setMediaPreview(null);
            fetchRooms();
        } catch (err: any) {
            console.error('Submission error:', err);
            setError(err.message || 'Failed to save room.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteRoom = async (id: string) => {
        if (!confirm('Are you sure you want to delete this room?')) return;
        try {
            const { error } = await supabase
                .from('shop_rooms')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchRooms();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const openAddModal = () => {
        setEditingRoom({ name: '', capacity: 2, price_per_hour: 0, description: '', status: 'available', tags: [] });
        setMediaFile(null);
        setMediaPreview(null);
        setIsModalOpen(true);
    };

    const openEditModal = (room: Room) => {
        setEditingRoom({ ...room, tags: room.tags || [] });
        setMediaPreview(room.image_url);
        setMediaFile(null);
        setIsModalOpen(true);
    };

    const toggleTag = (tag: string) => {
        const currentTags = editingRoom?.tags || [];
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];
        setEditingRoom({ ...editingRoom, tags: newTags });
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header Area */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter">Room Management</h2>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Manage KTV & VIP experiences</p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-2xl text-xs font-black tracking-widest shadow-lg shadow-pink-900/20 transition-all active:scale-95 group"
                >
                    <span className="text-lg group-hover:rotate-90 transition-transform">+</span>
                    ADD ROOM
                </button>
            </div>

            {/* Room List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {rooms.map((room) => (
                    <div key={room.id} className="group bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden hover:border-pink-500/30 transition-all duration-500 backdrop-blur-xl">
                        <div className="aspect-video relative overflow-hidden">
                            {room.image_url ? (
                                <img src={room.image_url} alt={room.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                            ) : (
                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-500 italic text-xs uppercase tracking-widest">No Image</div>
                            )}
                            <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest border border-white/10">
                                {room.status}
                            </div>
                        </div>
                        
                        <div className="p-6 relative pb-20">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-black tracking-tight">{room.name}</h3>
                                    <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">{room.capacity} PEOPLE MAX</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-pink-500 font-black text-lg leading-none">{room.price_per_hour?.toLocaleString()}</p>
                                    <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest mt-1">MMK / HOUR</p>
                                </div>
                            </div>
                            
                            <p className="text-zinc-400 text-xs line-clamp-2 font-medium mb-6">
                                {room.description || 'No description provided.'}
                            </p>

                            <div className="flex justify-between items-end">
                                {/* Equipment & Service Toggle */}
                                <div className="relative group/tags">
                                    <button className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 group-active/tags:scale-95">
                                        <span>🎤</span> Equipment & Service
                                    </button>
                                    {/* Popover Layer - Enhanced Glassmorphism */}
                                    <div className="absolute bottom-full left-[-24px] mb-3 w-[calc(100%+48px)] p-6 bg-black/60 backdrop-blur-3xl border-y border-white/10 shadow-2xl opacity-0 invisible group-hover/tags:opacity-100 group-hover/tags:visible group-focus-within/tags:opacity-100 group-focus-within/tags:visible transition-all z-30 pointer-events-none group-hover/tags:pointer-events-auto transform translate-y-2 group-hover/tags:translate-y-0">
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-4 border-b border-white/5 pb-3">Room Amenities</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {room.tags && room.tags.length > 0 ? (
                                                room.tags.map(tag => (
                                                    <span key={tag} className="px-3 py-1 bg-pink-500/10 text-pink-500 text-[9px] font-black uppercase tracking-widest rounded-lg border border-pink-500/20">
                                                        {tag}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-[9px] text-zinc-600 font-bold uppercase italic tracking-widest">No equipment listed</span>
                                            )}
                                        </div>
                                        {/* Popover Arrow */}
                                        <div className="absolute top-full left-6 -mt-1.5 w-3 h-3 bg-black/90 border-r border-b border-white/10 rotate-45" />
                                    </div>
                                </div>

                                {/* Action Buttons - Bottom Right */}
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => openEditModal(room)}
                                        className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-white transition-all border border-white/5 hover:border-white/20 active:scale-90"
                                        title="Edit Details"
                                    >
                                        <EditIcon />
                                    </button>
                                    <button 
                                        onClick={() => deleteRoom(room.id)}
                                        className="w-10 h-10 bg-red-500/5 hover:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500/40 hover:text-red-500 transition-all border border-red-500/10 hover:border-red-500/20 active:scale-90"
                                        title="Remove"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {rooms.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🎤</div>
                    <p className="text-zinc-500 font-bold italic">No rooms registered. Start by adding your first KTV room!</p>
                </div>
            )}

            {/* Sliding Drawer Modal */}
            <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isModalOpen ? 'visible' : 'invisible'}`}>
                {/* Backdrop */}
                <div 
                    className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500 ${isModalOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => !isSubmitting && setIsModalOpen(false)}
                />

                {/* Drawer */}
                <div className={`absolute top-0 right-0 h-full w-full max-w-lg bg-zinc-950 border-l border-white/5 shadow-2xl transition-transform duration-500 ease-out p-10 flex flex-col ${isModalOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex justify-between items-center mb-10">
                        <h2 className="text-2xl font-black tracking-tighter uppercase">{editingRoom?.id ? 'Edit' : 'Add New'} Room</h2>
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all"
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold p-4 rounded-2xl">
                                {error}
                            </div>
                        )}

                        {/* Image Upload */}
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-video bg-zinc-900 rounded-3xl border-2 border-dashed border-white/5 hover:border-pink-500/30 transition-all cursor-pointer overflow-hidden relative group"
                        >
                            {mediaPreview ? (
                                <img src={mediaPreview} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🖼️</div>
                                    <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Upload Room Image</span>
                                </div>
                            )}
                            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
                        </div>

                        {/* Inputs */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Room Name</label>
                                <input 
                                    type="text" 
                                    placeholder="Enter room name (e.g. VIP 101)"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                    value={editingRoom?.name || ''}
                                    onChange={(e) => setEditingRoom({...editingRoom, name: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Capacity</label>
                                    <input 
                                        type="number" 
                                        placeholder="8"
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                        value={editingRoom?.capacity || ''}
                                        onChange={(e) => setEditingRoom({...editingRoom, capacity: Number(e.target.value)})}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Price / Hour</label>
                                    <input 
                                        type="number" 
                                        placeholder="50000"
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                        value={editingRoom?.price_per_hour || ''}
                                        onChange={(e) => setEditingRoom({...editingRoom, price_per_hour: Number(e.target.value)})}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Description</label>
                                <textarea 
                                    placeholder="Describe the room features, amenities..."
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors min-h-[120px] resize-none"
                                    value={editingRoom?.description || ''}
                                    onChange={(e) => setEditingRoom({...editingRoom, description: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Availability Status</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['available', 'booked'].map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setEditingRoom({...editingRoom, status})}
                                            className={`py-3 rounded-xl text-[10px] font-black tracking-widest uppercase border transition-all ${editingRoom?.status === status ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'}`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Room Tags</label>
                                <div className="flex flex-wrap gap-2">
                                    {ROOM_TAGS.map((tag) => (
                                        <button
                                            key={tag}
                                            type="button"
                                            onClick={() => toggleTag(tag)}
                                            className={`px-4 py-2 rounded-lg text-[9px] font-black tracking-widest uppercase border transition-all ${editingRoom?.tags?.includes(tag) ? 'bg-pink-500/20 border-pink-500 text-pink-500' : 'bg-white/5 border-white/5 text-zinc-600 hover:bg-white/10'}`}
                                        >
                                            {tag}
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
                                {isSubmitting ? 'Saving...' : (editingRoom?.id ? 'Update Room' : 'Add Room')}
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
