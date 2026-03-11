'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

export default function ShopPostManagement() {
    const { shopId } = useParams();
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            const { data } = await supabase
                .from('posts')
                .select('*')
                .eq('shop_id', shopId)
                .order('created_at', { ascending: false });
            setPosts(data || []);
            setLoading(false);
        };
        if (shopId) fetchPosts();
    }, [shopId]);

    const createPost = async () => {
        const content = prompt('What is on your mind?');
        if (!content) return;
        
        const { error } = await supabase.from('posts').insert([{ 
            shop_id: shopId, 
            content,
            type: 'shop_update'
        }]);

        if (error) alert(error.message);
        else {
            const { data } = await supabase.from('posts').select('*').eq('shop_id', shopId).order('created_at', { ascending: false });
            setPosts(data || []);
        }
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tight">Shop Updates & Feed</h2>
                <button 
                    onClick={createPost}
                    className="px-8 py-4 bg-white text-black hover:bg-zinc-200 rounded-2xl text-[10px] font-black tracking-widest transition-all uppercase shadow-xl"
                >
                    + CREATE NEW POST
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => (
                    <div key={post.id} className="bg-zinc-900 border border-white/5 rounded-[2.5rem] overflow-hidden group">
                        <div className="aspect-square bg-zinc-800 flex items-center justify-center text-3xl">
                            {post.media_url ? <img src={post.media_url} className="w-full h-full object-cover" /> : '📸'}
                        </div>
                        <div className="p-8">
                            <p className="text-xs text-zinc-400 font-bold leading-relaxed mb-6 line-clamp-3">
                                {post.content}
                            </p>
                            <div className="flex justify-between items-center pt-6 border-t border-white/5">
                                <span className="text-[9px] font-black text-zinc-500 tracking-widest">
                                    {new Date(post.created_at).toLocaleDateString()}
                                </span>
                                <div className="flex gap-2">
                                    <button className="p-2 hover:text-pink-500 transition-colors">✏️</button>
                                    <button className="p-2 hover:text-red-500 transition-colors">🗑️</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {posts.length === 0 && (
                    <div className="col-span-full py-24 text-center bg-zinc-900/20 rounded-[3rem] border border-dashed border-white/10">
                        <p className="text-zinc-500 font-black italic uppercase tracking-widest">Share your first update with your followers!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
