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

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tighter">Content Moderation</h2>
                <div className="flex gap-4">
                    <button 
                        onClick={fetchPosts}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black tracking-widest transition-all"
                    >
                        REFRESH
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                    <div key={post.id} className="bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-xl group flex flex-col h-full">
                        {post.media_url ? (
                            <div className="aspect-video w-full overflow-hidden relative">
                                <img src={post.media_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black tracking-widest">
                                    {post.type?.toUpperCase() || 'POST'}
                                </div>
                            </div>
                        ) : (
                            <div className="aspect-video w-full bg-zinc-800 flex items-center justify-center text-zinc-600 italic text-xs">
                                No media attachment
                            </div>
                        )}
                        
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
                                    <img src={post.user?.avatar_url || '/placeholder-avatar.png'} alt="" className="w-full h-full object-cover" />
                                </div>
                                <span className="text-xs font-black">{post.user?.nickname || 'Unknown'}</span>
                            </div>

                            <p className="text-sm text-zinc-300 line-clamp-3 mb-6 font-medium leading-relaxed">
                                {post.content}
                            </p>

                            <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-black text-zinc-500">
                                    {new Date(post.created_at).toLocaleDateString()}
                                </span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => deletePost(post.id)}
                                        className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-all"
                                        title="Delete Post"
                                    >
                                        🗑️
                                    </button>
                                    <button className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all">
                                        👁️
                                    </button>
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
        </div>
    );
}
