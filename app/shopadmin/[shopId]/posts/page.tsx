'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { getEffectiveUserId } from '../../../../lib/auth-util';
import LoadingScreen from '../../../components/LoadingScreen';
import CircularProgress from '../../../components/CircularProgress';
import { isBunnyStream, getBunnyStreamVideoUrl, isVideo } from '../../../../lib/bunny';

interface Post {
    id: string;
    title: string;
    main_image_url: string;
    created_at: string;
}

export default function ShopPostManagement() {
    const { shopId } = useParams();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Create Modal State
    const [shopName, setShopName] = useState('Shop Admin');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const fetchPosts = async () => {
        const { data } = await supabase
            .from('posts')
            .select('*')
            .eq('shop_id', shopId)
            .order('created_at', { ascending: false });
        setPosts(data || []);
        setLoading(false);
    };

    useEffect(() => {
        if (shopId) {
            fetchPosts();
            fetchShopName();
        }
    }, [shopId]);

    const fetchShopName = async () => {
        const { data } = await supabase
            .from('shops')
            .select('name')
            .eq('id', shopId)
            .single();
        if (data?.name) setShopName(data.name);
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

    const handleSubmit = async () => {
        if (!title.trim() && !mediaFile) {
            alert('Please provide a title or an image');
            setIsSubmitting(false);
            return;
        }
        setIsSubmitting(true);

        try {
            const userId = await getEffectiveUserId();
            let publicUrl = '';

            // 1. Upload Media if exists
            if (mediaFile) {
                const { uploadMedia } = await import('../../../../lib/media-upload');
                const { url, error: uploadError } = await uploadMedia(mediaFile, 'posts');

                if (uploadError) throw new Error(`Upload failed: ${uploadError}`);
                publicUrl = url;
            }

            // 2. Insert Post
            const { error } = await supabase.from('posts').insert([{ 
                shop_id: shopId, 
                user_id: userId,
                main_image_url: publicUrl,
                file_size: mediaFile ? mediaFile.size : 0, // Store file size
                location_name: 'Shop Update',
                name: shopName, // Use actual shop name
                title: title, // Use full title
                area: 'Shop',
                rating: 5.0,
                price_per_hour: 0,
                currency: 'MMK'
            }]);

            if (error) throw error;
            
            // Success
            setIsCreateModalOpen(false);
            setTitle('');
            setMediaFile(null);
            setMediaPreview(null);
            setUploadProgress(0); // Reset progress
            fetchPosts();
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
    };

    const deletePost = async (id: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchPosts();
    };


    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 relative min-h-[80vh]">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Shop Updates</h2>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Connect with your followers</p>
                </div>
                <button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-2xl text-[10px] font-black tracking-widest transition-all uppercase shadow-xl active:scale-95 group"
                >
                    <span className="text-lg group-hover:rotate-90 transition-transform">+</span>
                    CREATE NEW POST
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => {
                    const mediaUrl = post.main_image_url;

                    return (
                        <div key={post.id} className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden group hover:border-white/10 transition-all">
                            <div className="aspect-square bg-zinc-800 flex items-center justify-center text-3xl relative overflow-hidden">
                                {mediaUrl ? (
                                    isBunnyStream(mediaUrl) ? (
                                        <video
                                            src={getBunnyStreamVideoUrl(mediaUrl) || ''}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            muted
                                            playsInline
                                            loop
                                            onMouseOver={(e) => e.currentTarget.play()}
                                            onMouseOut={(e) => {
                                                e.currentTarget.pause();
                                                e.currentTarget.currentTime = 0;
                                            }}
                                        />
                                    ) : (mediaUrl && mediaUrl.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) !== null) ? (
                                        <video 
                                            src={mediaUrl} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                            muted
                                            playsInline
                                            onMouseOver={(e) => e.currentTarget.play()}
                                            onMouseOut={(e) => {
                                                e.currentTarget.pause();
                                                e.currentTarget.currentTime = 0;
                                            }}
                                        />
                                    ) : (
                                        <img src={mediaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                                    )
                                ) : (
                                    <span className="opacity-20 grayscale">📸</span>
                                )}
                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => deletePost(post.id)}
                                        className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-2xl"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                                    </button>
                                </div>
                                {isVideo(mediaUrl) && (
                                    <div className="absolute bottom-4 left-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                    </div>
                                )}
                            </div>
                            <div className="p-8">
                                <p className="text-sm text-zinc-300 font-medium leading-relaxed mb-6 line-clamp-3">
                                    {post.title}
                                </p>
                                <div className="flex justify-between items-center pt-6 border-t border-white/5">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-zinc-500 tracking-widest uppercase">
                                            Post Date
                                        </span>
                                        <span className="text-xs font-bold text-white tracking-tight">
                                            {new Date(post.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5 text-zinc-500">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                            <span className="text-[10px] font-black">--</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-zinc-500">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                            <span className="text-[10px] font-black">--</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {posts.length === 0 && (
                    <div className="col-span-full py-32 text-center bg-zinc-900/20 rounded-[4rem] border border-dashed border-white/10 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-2xl grayscale opacity-20">🪩</div>
                        <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-xs">Share your first update with the world</p>
                        <button 
                            onClick={() => setIsCreateModalOpen(true)}
                            className="mt-8 text-pink-500 font-black text-[10px] tracking-widest uppercase hover:underline"
                        >
                            + Tap here to begin
                        </button>
                    </div>
                )}
            </div>

            {/* Sliding Drawer Modal (Synced with Rooms style) */}
            <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isCreateModalOpen ? 'visible' : 'invisible'}`}>
                {/* Backdrop */}
                <div 
                    className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500 ${isCreateModalOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => !isSubmitting && setIsCreateModalOpen(false)}
                />

                {/* Drawer */}
                <div className={`absolute top-0 right-0 h-full w-full max-w-lg bg-zinc-950 border-l border-white/5 shadow-2xl transition-transform duration-500 ease-out flex flex-col ${isCreateModalOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-8 border-b border-white/5">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-white">Create Update</h3>
                                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1 italic">Designing the next viral moment</p>
                            </div>
                            <button 
                                onClick={() => setIsCreateModalOpen(false)}
                                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-90"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10">
                            {/* Media Zone */}
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 px-2">Photos & Videos</label>
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`w-full aspect-video bg-zinc-900/50 rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center relative overflow-hidden group hover:border-pink-500/50 transition-all cursor-pointer ${mediaPreview ? 'border-none' : ''}`}
                                >
                                    {mediaPreview ? (
                                        <div className="relative w-full h-full">
                                            <img src={mediaPreview} className="w-full h-full object-cover" alt="Preview" />
                                            {isSubmitting && (
                                                <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
                                                    <CircularProgress percentage={uploadProgress} />
                                                </div>
                                            )}
                                            {!isSubmitting && (
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-[10px] font-black text-white bg-black/60 px-4 py-2 rounded-full uppercase tracking-widest">Change Media</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center p-12">
                                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl group-hover:scale-110 transition-transform">📸</div>
                                            <p className="text-white font-bold text-sm tracking-tight mb-2 uppercase">Drag & Drop or Click</p>
                                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Supports high-res JPG, PNG, MP4</p>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        hidden 
                                        ref={fileInputRef}
                                        accept="image/*,video/*"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            </div>

                            {/* Content Zone */}
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 px-2">Caption & Content</label>
                                <textarea 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Write something inspiring about your latest updates, exclusive deals, or behind the scenes access..."
                                    className="w-full bg-white/5 border border-white/5 rounded-[2.5rem] p-8 text-white placeholder-zinc-700 focus:outline-none focus:border-pink-500/50 min-h-[250px] resize-none transition-all font-medium leading-relaxed"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 bg-black/50 backdrop-blur-xl border-t border-white/5">
                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting || (!title.trim() && !mediaFile)}
                                className="w-full py-6 bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-3xl font-black text-xs tracking-[0.4em] uppercase transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-[0.98] relative overflow-hidden group"
                            >
                                <span className="relative z-10">
                                    {isSubmitting ? (uploadProgress >= 100 ? 'FINALIZING...' : 'UPLOADING YOUR VISION...') : 'PUBLISH TO FEED'}
                                </span>
                                {isSubmitting && (
                                    <div 
                                        className="absolute inset-0 bg-pink-600 transition-all duration-300 ease-out opacity-20"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                )}
                            </button>
                            <p className="text-center text-[8px] font-black text-zinc-600 uppercase tracking-[0.4em] mt-6">
                                Estimated reach: High visibility on main feed
                            </p>
                        </div>
                </div>
            </div>
        </div>
    );
}
