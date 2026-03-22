'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

interface StaffMember {
    id: string;
    shop_id: string;
    name: string;
    role: string;
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

export default function StaffManagement() {
    const { shopId } = useParams();
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [editingMember, setEditingMember] = useState<Partial<StaffMember> | null>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('shop_staff')
                .select('*')
                .eq('shop_id', shopId)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setStaff(data || []);
        } catch (err: any) {
            console.error('Error fetching staff:', err);
            setError('Failed to load staff profiles.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (shopId) fetchStaff();
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
            let image_url = editingMember?.image_url || '';

            if (mediaFile) {
                const { uploadMedia } = await import('../../../../lib/media-upload');
                const { url, error: uploadError } = await uploadMedia(mediaFile, `staff/${shopId}`);

                if (uploadError) throw new Error(`Upload failed: ${uploadError}`);
                image_url = url;
            }

            const staffData = {
                shop_id: shopId as string,
                name: editingMember?.name || '',
                role: editingMember?.role || 'Performer',
                image_url: image_url
            };

            let result;
            if (editingMember?.id) {
                result = await supabase
                    .from('shop_staff')
                    .update(staffData)
                    .eq('id', editingMember.id);
            } else {
                result = await supabase
                    .from('shop_staff')
                    .insert([staffData]);
            }

            if (result.error) throw result.error;

            setIsModalOpen(false);
            setEditingMember(null);
            setMediaFile(null);
            setMediaPreview(null);
            fetchStaff();
        } catch (err: any) {
            console.error('Submission error:', err);
            setError(err.message || 'Failed to save staff member.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteStaff = async (id: string) => {
        if (!confirm('Are you sure you want to delete this staff member?')) return;
        try {
            const { error } = await supabase
                .from('shop_staff')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchStaff();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const openAddModal = () => {
        setEditingMember({ name: '', role: 'Resident DJ' });
        setMediaFile(null);
        setMediaPreview(null);
        setIsModalOpen(true);
    };

    const openEditModal = (member: StaffMember) => {
        setEditingMember({ ...member });
        setMediaPreview(member.image_url);
        setMediaFile(null);
        setIsModalOpen(true);
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center text-white">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter">Staff & Entertainment</h2>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Manage your team and guest performers</p>
                </div>
                <button 
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black tracking-widest transition-all uppercase text-white active:scale-95 group"
                >
                    <span className="text-lg group-hover:rotate-90 transition-transform">+</span>
                    ADD STAFF
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {staff.map((member) => (
                    <div key={member.id} className="group bg-zinc-900/40 border border-white/5 p-6 rounded-[2.5rem] transition-all duration-500 hover:bg-zinc-800/50 hover:border-white/10 backdrop-blur-xl">
                        <div className="w-full aspect-square rounded-[2rem] bg-zinc-800 mb-6 flex items-center justify-center text-4xl overflow-hidden border border-white/5 shadow-2xl text-white">
                            {member.image_url ? (
                                <img src={member.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                            ) : (
                                <span className="opacity-20 grayscale">🎧</span>
                            )}
                        </div>
                        <div className="space-y-1 mb-6">
                            <h3 className="font-black text-lg text-white tracking-tight">{member.name}</h3>
                            <p className="text-[10px] font-black text-pink-500 uppercase tracking-[0.2em]">{member.role || 'Performer'}</p>
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => openEditModal(member)}
                                className="flex-1 h-12 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 border border-white/5 text-white"
                            >
                                <EditIcon /> EDIT
                            </button>
                            <button 
                                onClick={() => deleteStaff(member.id)}
                                className="w-12 h-12 bg-red-500/5 hover:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500/40 hover:text-red-500 transition-all border border-red-500/10 active:scale-95"
                            >
                                <TrashIcon />
                            </button>
                        </div>
                    </div>
                ))}

                {staff.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-zinc-900/20 rounded-[2.5rem] border border-dashed border-white/10">
                        <div className="text-4xl mb-4 opacity-10 grayscale">🎧</div>
                        <p className="text-zinc-500 font-bold italic text-white">No staff profiles registered yet.</p>
                    </div>
                )}
            </div>

            {/* Sliding Drawer Modal */}
            <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isModalOpen ? 'visible' : 'invisible'}`}>
                <div 
                    className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500 ${isModalOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => !isSubmitting && setIsModalOpen(false)}
                />

                <div className={`absolute top-0 right-0 h-full w-full max-w-lg bg-zinc-950 border-l border-white/5 shadow-2xl transition-transform duration-500 ease-out p-10 flex flex-col ${isModalOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex justify-between items-center mb-10 text-white">
                        <h2 className="text-2xl font-black tracking-tighter uppercase">{editingMember?.id ? 'Edit' : 'Add'} Staff Member</h2>
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
                            className="aspect-square w-48 mx-auto bg-zinc-900 rounded-[2.5rem] border-2 border-dashed border-white/5 hover:border-pink-500/30 transition-all cursor-pointer overflow-hidden relative group"
                        >
                            {mediaPreview ? (
                                <img src={mediaPreview} className="w-full h-full object-cover" alt="Preview" />
                             ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🎧</div>
                                    <span className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">Photo</span>
                                </div>
                            )}
                            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Full Name / Stage Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. DJ Figyaro"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                    value={editingMember?.name || ''}
                                    onChange={(e) => setEditingMember({...editingMember, name: e.target.value})}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Role / Title</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Resident DJ"
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-pink-500 transition-colors"
                                    value={editingMember?.role || ''}
                                    onChange={(e) => setEditingMember({...editingMember, role: e.target.value})}
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-6">
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-2xl text-[10px] font-black tracking-[0.3em] uppercase shadow-2xl shadow-pink-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                {isSubmitting ? 'SAVING...' : (editingMember?.id ? 'UPDATE MEMBER' : 'ADD MEMBER')}
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
