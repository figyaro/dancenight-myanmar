'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';
import SlideOver from '../components/SlideOver';
import { uploadMedia } from '../../../lib/media-upload';
import { isBunnyStream, getBunnyStreamVideoUrl } from '../../../lib/bunny';

const isVideo = (url: string | null) => {
    if (!url) return false;
    // Check if it's a direct video link or a Bunny Stream iframe link
    return url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) !== null || isBunnyStream(url);
};

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
        // Fetch posts with user info and aggregate counts for likes/comments/impressions
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
            // Fetch interaction counts separately to ensure accuracy and real-time feel
            const { data: likes } = await supabase.from('likes').select('post_id');
            const { data: comments } = await supabase.from('comments').select('post_id');
            const { data: analytics } = await supabase.from('analytics_events')
                .select('post_id')
                .eq('event_type', 'post_impression');

            const enrichedPosts = (data || []).map(post => ({
                ...post,
                likes_count: likes?.filter(l => l.post_id === post.id).length || 0,
                comments_count: comments?.filter(c => c.post_id === post.id).length || 0,
                impression_count: analytics?.filter(a => a.post_id === post.id).length || 0
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
        setEditCaption(post.title || '');
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
            let fileSize = selectedPost.file_size;

            // 1. Handle Media Update if new file selected
            if (newMediaFile) {
                const { url, error: uploadError } = await uploadMedia(newMediaFile, 'posts');
                if (uploadError) throw new Error(uploadError);
                mediaUrl = url;
                fileSize = newMediaFile.size;
            }

            // 2. Update DB
            const { error: updateError } = await supabase
                .from('posts')
                .update({
                    title: editCaption, // Use 'title' which exists in the schema
                    main_image_url: mediaUrl,
                    file_size: fileSize,
                    updated_at: new Date().toISOString()
                })
                .eq('id', selectedPost.id);
            
            if (updateError) throw updateError;

            // 3. Refresh Local State
            setPosts(prev => prev.map(p => p.id === selectedPost.id ? { 
                ...p, 
                title: editCaption,
                main_image_url: mediaUrl,
                file_size: fileSize
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
        return url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) !== null || url.includes('iframe.mediadelivery.net');
    };

    const isBunnyStream = (url: string) => {
        return url && url.includes('iframe.mediadelivery.net');
    };

    const formatFileSize = (bytes: number) => {
        if (!bytes) return 'N/A';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
                                isBunnyStream(post.main_image_url) ? (
                                    <video
                                        src={getBunnyStreamVideoUrl(post.main_image_url) || ''}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        muted
                                        playsInline
                                        loop
                                        onMouseOver={(e) => e.currentTarget.play()}
                                        onMouseOut={(e) => {
                                            e.currentTarget.pause();
                                            e.currentTarget.currentTime = 0;
                                        }}
                                    />
                                ) : isVideo(post.main_image_url) ? (
                                    <video 
                                        src={post.main_image_url} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        muted
                                        playsInline
                                        onMouseOver={(e) => e.currentTarget.play()}
                                        onMouseOut={(e) => {
                                            e.currentTarget.pause();
                                            e.currentTarget.currentTime = 0;
                                        }}
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
                                    <img src={post.user?.avatar_url || '/placeholder-avatar.png'} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-[9px] font-black text-white/90 truncate">{post.user?.nickname || 'Unknown'}</span>
                            </div>

                            <p className="text-[10px] text-zinc-300 line-clamp-2 font-medium leading-relaxed mb-3">
                                {post.title || 'No caption'}
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
                                <div className="mx-auto w-full h-full bg-zinc-800 rounded-3xl overflow-hidden relative group">
                                    {selectedPost.main_image_url && (
                                        isBunnyStream(selectedPost.main_image_url) ? (
                                            <video
                                                src={getBunnyStreamVideoUrl(selectedPost.main_image_url) || ''}
                                                className="w-full h-full object-cover"
                                                controls
                                                playsInline
                                            />
                                        ) : isVideo(selectedPost.main_image_url) ? (
                                            <video 
                                                src={selectedPost.main_image_url} 
                                                className="w-full h-full object-contain"
                                                controls
                                                autoPlay
                                                muted
                                            />
                                        ) : (
                                            <img src={selectedPost.main_image_url} className="w-full h-full object-contain" alt="" />
                                        )
                                    )}
                                </div>
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
                            {/* Identity Section (Enlarged) */}
                            <div className="col-span-2 p-6 bg-white/5 border border-white/5 rounded-3xl flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 shadow-xl">
                                    <img src={selectedPost.user?.avatar_url || '/placeholder-avatar.png'} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-0.5">Author Identity</span>
                                    <h4 className="text-xl font-black text-white leading-tight">{selectedPost.user?.nickname || 'Unknown User'}</h4>
                                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight mt-1 truncate max-w-[200px]">ID: {selectedPost.id}</p>
                                </div>
                            </div>

                            {/* Analytics Section */}
                            <div className="p-4 bg-zinc-900 border border-white/5 rounded-2xl">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-3">Performance Data</span>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-400 font-bold">Impressions</span>
                                        <span className="text-white font-black">{selectedPost.impression_count || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-400 font-bold">Likes</span>
                                        <span className="text-white font-black">{selectedPost.likes_count || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-400 font-bold">Comments</span>
                                        <span className="text-white font-black">{selectedPost.comments_count || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Technical Metadata */}
                            <div className="p-4 bg-zinc-900 border border-white/5 rounded-2xl">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-3">File Technicals</span>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-400 font-bold">Size</span>
                                        <span className="text-white font-black">{formatFileSize(selectedPost.file_size)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-400 font-bold">Location</span>
                                        <span className="text-white font-black truncate max-w-[80px]" title={selectedPost.location_name}>{selectedPost.location_name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-zinc-400 font-bold">Date</span>
                                        <span className="text-white font-black">{new Date(selectedPost.created_at).toLocaleDateString()}</span>
                                    </div>
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
