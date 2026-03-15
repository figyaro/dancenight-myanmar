'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';

export default function PostManagement() {
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                user:users(nickname, avatar_url)
            `)
            .order('created_at', { ascending: false });
        
        if (error) console.error('Error fetching posts:', error);
        else setPosts(data || []);
        setLoading(false);
    };

    const deletePost = async (postId: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;

        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);
        
        if (error) alert('Error: ' + error.message);
        else setPosts(prev => prev.filter(p => p.id !== postId));
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
                    <div key={post.id} className="relative aspect-[9/19] bg-zinc-900 rounded-[2.5rem] border-4 border-zinc-800 overflow-hidden group shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:border-white/20">
                        {/* Media Content */}
                        <div className="absolute inset-0 w-full h-full">
                            {post.main_image_url ? (
                                isVideo(post.main_image_url) ? (
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
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 italic">No media attachment</span>
                                </div>
                            )}
                            
                            {/* Dark Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
                            
                            {/* Video Indicator */}
                            {isVideo(post.main_image_url) && (
                                <div className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                </div>
                            )}
                        </div>

                        {/* Top Notch/Info Area */}
                        <div className="absolute top-0 inset-x-0 h-12 flex items-center justify-between px-6 z-10">
                            <div className="bg-black px-4 py-1.5 rounded-full text-[8px] font-black tracking-[0.2em] border border-white/5">
                                {post.type?.toUpperCase() || 'POST'}
                            </div>
                            <button 
                                onClick={() => deletePost(post.id)}
                                className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500 text-white flex items-center justify-center transition-all border border-red-500/50 backdrop-blur-md"
                            >
                                <span className="text-[10px]">✕</span>
                            </button>
                        </div>

                        {/* Bottom Content Area - Glassmorphism */}
                        <div className="absolute bottom-0 inset-x-0 p-4 pt-10 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                            {/* User Info */}
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20">
                                    <img src={post.user?.avatar_url || '/placeholder-avatar.png'} alt="" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-[10px] font-black text-white/90 truncate">{post.user?.nickname || 'Unknown'}</span>
                            </div>

                            {/* Post Text */}
                            <p className="text-[11px] text-zinc-200 line-clamp-3 font-medium leading-relaxed mb-4">
                                {post.content}
                            </p>

                            {/* Meta Info */}
                            <div className="flex items-center justify-between py-2 border-t border-white/10">
                                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">
                                    {new Date(post.created_at).toLocaleDateString()}
                                </span>
                                <div className="flex gap-1.5">
                                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px]">💬</div>
                                    <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px]">❤️</div>
                                </div>
                            </div>
                        </div>

                        {/* Smartphone Home Bar Effect */}
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 bg-white/20 rounded-full" />
                    </div>
                ))}
            </div>

            {posts.length === 0 && (
                <div className="py-20 text-center">
                    <p className="text-zinc-500 font-bold italic">No posts found to moderate.</p>
                </div>
            )}
        </div>
    );
}
