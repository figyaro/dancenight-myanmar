'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

interface MenuItem {
    id: string;
    shop_id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    image_url: string;
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

export default function MenuManagement() {
    const { shopId } = useParams();
    const [menu, setMenu] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchMenu = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('shop_menu_items')
                .select('*')
                .eq('shop_id', shopId)
                .order('category', { ascending: true })
                .order('name', { ascending: true });
            
            if (error) throw error;
            setMenu(data || []);
        } catch (err: any) {
            console.error('Error fetching menu:', err);
            setError('Failed to load menu items.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (shopId) fetchMenu();
    }, [shopId]);

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
            let image_url = editingItem?.image_url || '';

            if (mediaFile) {
                const { uploadMedia } = await import('../../../../lib/media-upload');
                const { url, error: uploadError } = await uploadMedia(mediaFile, `menu/${shopId}`);

                if (uploadError) throw new Error(`Upload failed: ${uploadError}`);
                image_url = url;
            }

            const itemData = {
                shop_id: shopId as string,
                name: editingItem?.name || '',
                description: editingItem?.description || '',
                price: Number(editingItem?.price) || 0,
                category: editingItem?.category || 'Food',
                image_url: image_url
            };

            let result;
            if (editingItem?.id) {
                result = await supabase
                    .from('shop_menu_items')
                    .update(itemData)
                    .eq('id', editingItem.id);
            } else {
                result = await supabase
                    .from('shop_menu_items')
                    .insert([itemData]);
            }

            if (result.error) throw result.error;

            setIsModalOpen(false);
            setEditingItem(null);
            setMediaFile(null);
            setMediaPreview(null);
            fetchMenu();
        } catch (err: any) {
            console.error('Submission error:', err);
            setError(err.message || 'Failed to save menu item.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteItem = async (id: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            const { error } = await supabase
                .from('shop_menu_items')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchMenu();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const openAddModal = () => {
        setEditingItem({ name: '', description: '', price: 0, category: 'Food' });
        setMediaFile(null);
        setMediaPreview(null);
        setIsModalOpen(true);
    };

    const openEditModal = (item: MenuItem) => {
        setEditingItem({ ...item });
        setMediaPreview(item.image_url);
        setMediaFile(null);
        setIsModalOpen(true);
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter text-white">Digital Menu</h2>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Manage your shop's food, drinks and services</p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-2xl text-xs font-black tracking-widest shadow-lg shadow-pink-900/20 transition-all active:scale-95 group"
                >
                    <span className="text-lg group-hover:rotate-90 transition-transform">+</span>
                    ADD ITEM
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {menu.map((item) => (
                    <div key={item.id} className="group bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden hover:border-pink-500/30 transition-all duration-500 backdrop-blur-xl">
                        <div className="aspect-video relative overflow-hidden bg-zinc-800 text-white">
                            {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🍽️</div>
                            )}
                            <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[8px] font-black uppercase tracking-widest border border-white/10">
                                {item.category}
                            </div>
                        </div>
                        
                        <div className="p-6 relative">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-lg font-black tracking-tight text-white line-clamp-1">{item.name}</h3>
                                <p className="text-pink-500 font-black text-lg leading-none">${item.price}</p>
                            </div>
                            
                            <p className="text-zinc-400 text-xs line-clamp-3 font-medium mb-6 min-h-[48px]">
                                {item.description || 'No description provided.'}
                            </p>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => openEditModal(item)}
                                    className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 border border-white/5 text-white"
                                >
                                    <EditIcon /> EDIT
                                </button>
                                <button 
                                    onClick={() => deleteItem(item.id)}
                                    className="w-12 h-12 bg-red-500/5 hover:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500/40 hover:text-red-500 transition-all border border-red-500/10 active:scale-95"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {menu.length === 0 && (
                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🍽️</div>
                    <p className="text-zinc-500 font-bold italic">No menu items added yet.</p>
                </div>
            )}

            {/* Sliding Drawer Modal */}
            <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isModalOpen ? 'visible' : 'invisible'}`}>
                <div 
                    className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500 ${isModalOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => !isSubmitting && setIsModalOpen(false)}
                />

                <div className={`absolute top-0 right-0 h-full w-full max-w-lg bg-zinc-950 border-l border-white/5 shadow-2xl transition-transform duration-500 ease-out p-10 flex flex-col ${isModalOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex justify-between items-center mb-10 text-white">
                        <h2 className="text-2xl font-black tracking-tighter uppercase">{editingItem?.id ? 'Edit' : 'Add'} Menu Item</h2>
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all"
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar text-white">
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
                                    <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Upload Photo</span>
                                </div>
                            )}
                            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Item Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Signature Cocktail"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                    value={editingItem?.name || ''}
                                    onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Price</label>
                                    <input 
                                        type="number" 
                                        placeholder="0"
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                        value={editingItem?.price || ''}
                                        onChange={(e) => setEditingItem({...editingItem, price: Number(e.target.value)})}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Category</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors appearance-none text-white"
                                            value={editingItem?.category || 'Food'}
                                            onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                                        >
                                            <option value="Food" className="bg-zinc-900">Food</option>
                                            <option value="Drink" className="bg-zinc-900">Drink</option>
                                            <option value="Course" className="bg-zinc-900">Course</option>
                                            <option value="Other" className="bg-zinc-900">Other</option>
                                        </select>
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">▼</div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Description</label>
                                <textarea 
                                    placeholder="Brief description of the item..."
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors min-h-[120px] resize-none"
                                    value={editingItem?.description || ''}
                                    onChange={(e) => setEditingItem({...editingItem, description: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="pt-6">
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase shadow-2xl shadow-pink-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isSubmitting ? 'SAVING...' : (editingItem?.id ? 'UPDATE ITEM' : 'ADD ITEM')}
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
