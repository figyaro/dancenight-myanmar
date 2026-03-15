'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';
import SlideOver from '../components/SlideOver';
import { uploadMedia } from '../../../lib/media-upload';

export default function PostManagement() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [editCaption, setEditCaption] = useState('');
    const [newMediaFile, setNewMediaFile] = useState<File | null>(null);
    const [newMediaPreview, setNewMediaPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        // Fetch posts with user info and aggregate counts for likes/comments
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                user:users(nickname, avatar_url)
            `)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching posts:', error);
        } else {
            // Fetch interaction counts separately to ensure accuracy
            const { data: likes } = await supabase.from('likes').select('post_id');
            const { data: comments } = await supabase.from('comments').select('post_id');

            const enrichedPosts = (data || []).map(post => ({
                ...post,
                likes_count: likes?.filter(l => l.post_id === post.id).length || 0,
                comments_count: comments?.filter(c => c.post_id === post.id).length || 0
            }));
            setPosts(enrichedPosts);
        }
        setLoading(false);
    };

    const deletePost = async (postId: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;

        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);
        
        if (error) {
            alert('Error: ' + error.message);
        } else {
            setPosts(prev => prev.filter(p => p.id !== postId));
            if (selectedPost?.id === postId) setSelectedPost(null);
        }
    };

    const handleSelectPost = (post: any) => {
        setSelectedPost(post);
        setEditCaption(post.content || post.title || '');
        setNewMediaFile(null);
        setNewMediaPreview(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNewMediaFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewMediaPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveChanges = async () => {
        if (!selectedPost || isSaving) return;
        setIsSaving(true);

        try {
            let mediaUrl = selectedPost.main_image_url;

            // 1. Handle Media Update if new file selected
            if (newMediaFile) {
                const { url, error: uploadError } = await uploadMedia(newMediaFile, 'posts');
                if (uploadError) throw new Error(uploadError);
                mediaUrl = url;
            }

            // 2. Update DB
            const { error: updateError } = await supabase
                .from('posts')
                .update({
                    content: editCaption,
                    title: editCaption, // Update both if needed
                    main_image_url: mediaUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedPost.id);
            
            if (updateError) throw updateError;

            // 3. Refresh Local State
            setPosts(prev => prev.map(p => p.id === selectedPost.id ? { 
                ...p, 
                content: editCaption, 
                title: editCaption,
                main_image_url: mediaUrl 
            } : p));
            
            setSelectedPost(null);
            alert('Post updated successfully');
        } catch (err: any) {
            console.error('Update error:', err);
            alert('Failed to update post: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const isVideo = (url: string) => {
        if (!url) return false;
        return url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) !== null;
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tighter">Content Moderation</h2>
                <div className="flex gap-4">
                    <button 
                        onClick={fetchPosts}
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

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {posts.map((post) => (
                    <div 
                        key={post.id} 
                        onClick={() => handleSelectPost(post)}
                        className="relative aspect-[9/16] bg-zinc-900 rounded-[2rem] border-2 border-zinc-800 overflow-hidden group shadow-xl transition-all duration-500 hover:scale-[1.02] hover:border-white/20 cursor-pointer"
                    >
                        {/* Media Content */}
                        <div className="absolute inset-0 w-full h-full">
                            {post.main_image_url ? (
                                isVideo(post.main_image_url) ? (
                                    <video 
                                        src={post.main_image_url} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        muted
                                        playsInline
                                    />
                                ) : (
                                    <img 
                                        src={post.main_image_url} 
                                        alt="" 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                    />
                                )
                            ) : (
                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center p-6 text-center">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500 italic">No media</span>
                                </div>
                            )}
                            
                            {/* Dark Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                        </div>

                        {/* Top Info */}
                        <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start z-10">
                            <div className="px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[8px] font-black tracking-widest border border-white/5">
                                {post.type?.toUpperCase() || 'POST'}
                            </div>
                            <div className="flex gap-1">
                                {isVideo(post.main_image_url) && (
                                    <div className="w-6 h-6 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/5">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom Content Area */}
                        <div className="absolute bottom-0 inset-x-0 p-4 pt-10 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-full overflow-hidden border border-white/20">
                                    <img src={post.user?.avatar_url || '/placeholder-avatar.png'} alt="" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-[9px] font-black text-white/90 truncate">{post.user?.nickname || 'Unknown'}</span>
                            </div>

                            <p className="text-[10px] text-zinc-300 line-clamp-2 font-medium leading-relaxed mb-3">
                                {post.content || post.title || 'No caption'}
                            </p>

                            <div className="flex items-center justify-between py-2 border-t border-white/10">
                                <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">
                                    {new Date(post.created_at).toLocaleDateString()}
                                </span>
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400">
                                        <span>💬</span> {post.comments_count || 0}
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400">
                                        <span>❤️</span> {post.likes_count || 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {posts.length === 0 && (
                <div className="py-20 text-center">
                    <p className="text-zinc-500 font-bold italic">No posts found to moderate.</p>
                </div>
            )}

            {/* Slide Over Detail View */}
            <SlideOver
                isOpen={!!selectedPost}
                onClose={() => setSelectedPost(null)}
                title="Post Inspection"
                onSave={handleSaveChanges}
                isSaving={isSaving}
                saveLabel="Update Post"
            >
                {selectedPost && (
                    <div className="space-y-8">
                        {/* Media Preview Area */}
                        <div className="relative aspect-[9/16] bg-black rounded-3xl border border-white/10 overflow-hidden shadow-2xl mx-auto max-w-[300px]">
                            {newMediaPreview ? (
                                isVideo(newMediaFile?.name || '') ? (
                                    <video src={newMediaPreview} className="w-full h-full object-cover" controls autoPlay />
                                ) : (
                                    <img src={newMediaPreview} className="w-full h-full object-cover" />
                                )
                            ) : (
                                isVideo(selectedPost.main_image_url) ? (
                                    <video src={selectedPost.main_image_url} className="w-full h-full object-cover" controls autoPlay loop />
                                ) : (
                                    <img src={selectedPost.main_image_url} className="w-full h-full object-cover" />
                                )
                            )}

                            {/* Change Media Button */}
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-4 right-4 w-12 h-12 rounded-2xl bg-pink-600 hover:bg-pink-500 text-white flex items-center justify-center shadow-xl transition-all active:scale-95 border border-pink-400/30"
                                title="Change Media"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                                </svg>
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                hidden 
                                accept="image/*,video/*"
                            />
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Engagements</span>
                                <div className="flex gap-4">
                                    <div className="text-sm font-black text-white flex items-center gap-1.5">
                                        <span className="grayscale opacity-50">❤️</span> {selectedPost.likes_count || 0}
                                    </div>
                                    <div className="text-sm font-black text-white flex items-center gap-1.5">
                                        <span className="grayscale opacity-50">💬</span> {selectedPost.comments_count || 0}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Identity</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full overflow-hidden">
                                        <img src={selectedPost.user?.avatar_url || '/placeholder-avatar.png'} className="w-full h-full object-cover" />
                                    </div>
                                    <span className="text-[10px] font-black text-white uppercase italic">{selectedPost.user?.nickname || 'Unknown'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Caption Editor */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Post Caption</label>
                            <textarea 
                                value={editCaption}
                                onChange={(e) => setEditCaption(e.target.value)}
                                className="w-full h-32 bg-zinc-950 border border-white/10 rounded-2xl p-4 text-xs font-medium text-zinc-200 focus:outline-none focus:border-pink-500 transition-colors resize-none"
                                placeholder="Edit post caption..."
                            />
                        </div>

                        {/* Dangerous Actions */}
                        <div className="pt-4 border-t border-white/5">
                            <button 
                                onClick={() => deletePost(selectedPost.id)}
                                className="w-full py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black tracking-widest uppercase border border-red-500/20 transition-all"
                            >
                                DELETE PERMANENTLY
                            </button>
                        </div>
                    </div>
                )}
            </SlideOver>
        </div>
    );
}
