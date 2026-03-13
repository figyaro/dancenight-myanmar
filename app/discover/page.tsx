'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '../components/BottomNav';
import { supabase } from '../../lib/supabase';

interface Post {
    id: number;
    user_id: string;
    area: string;
    name: string;
    title: string;
    rating: number;
    main_image_url: string;
}

const sortTabs = [
    { id: 'newest', label: '新着' },
    { id: 'popular', label: '人気' },
    { id: 'interested', label: 'おすすめ' },
];

export default function Discover() {
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('newest');
    const [isSearchVisible, setIsSearchVisible] = useState(false);

    useEffect(() => {
        fetchPosts();
    }, [activeTab]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            let query = supabase.from('posts').select('*');

            if (activeTab === 'newest') {
                query = query.order('id', { ascending: false });
            } else if (activeTab === 'popular') {
                query = query.order('rating', { ascending: false });
            } else {
                // For "interested", just do id ascending or random
                query = query.order('id', { ascending: true });
            }

            const { data, error } = await query;
            if (error) throw error;
            setPosts(data || []);
        } catch (err) {
            console.error('Error fetching posts:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredPosts = posts.filter(post =>
        post.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Auto-play on scroll logic
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const video = entry.target.querySelector('video');
                    if (!video) return;

                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        video.play().catch(() => {});
                    } else {
                        video.pause();
                        video.currentTime = 0;
                    }
                });
            },
            { threshold: [0, 0.5, 1.0] }
        );

        const videoContainers = document.querySelectorAll('.video-container');
        videoContainers.forEach((container) => observer.observe(container));

        return () => observer.disconnect();
    }, [filteredPosts, loading]);

    return (
        <div className="bg-black min-h-screen text-white">
            {/* ヘッダー */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-md mx-auto px-4 pt-6 pb-2">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-400">
                            DISCOVER
                        </h1>
                        <button 
                            onClick={() => setIsSearchVisible(!isSearchVisible)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${isSearchVisible ? 'bg-pink-600 border-pink-500 text-white' : 'bg-zinc-900 border-white/5 text-zinc-400'}`}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                {isSearchVisible ? (
                                    <path d="M18 6L6 18M6 6l12 12" />
                                ) : (
                                    <>
                                        <circle cx="11" cy="11" r="8" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </>
                                )}
                            </svg>
                        </button>
                    </div>

                    {/* 検索バー */}
                    <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isSearchVisible ? 'max-h-24 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
                        <div className="relative">
                            <div className="absolute inset-0 bg-pink-500/20 blur-xl scale-95 opacity-50" />
                            <div className="relative">
                                <svg
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="エリア、名前、特徴で探索..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* ソートタブ */}
                    <div className="flex gap-1 bg-zinc-900/50 p-1 rounded-xl border border-white/5 mb-2">
                        {sortTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-2 rounded-lg text-xs font-black tracking-widest transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-gradient-to-tr from-pink-600 to-rose-500 text-white shadow-lg'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="pt-56 pb-24 px-4 overflow-x-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
                        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <span className="text-xs font-bold tracking-widest">LOADING TRENDS...</span>
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-20 text-zinc-600">
                        <p className="font-bold tracking-widest uppercase">No results found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredPosts.map((post) => (
                            <div
                                key={post.id}
                                onClick={() => router.push(`/home?postId=${post.id}`)}
                                className="relative aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer active:scale-95 transition-transform bg-zinc-900"
                            >
                                {post.main_image_url ? (
                                    post.main_image_url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) ? (
                                        <div className="relative w-full h-full video-container">
                                            <video 
                                                src={post.main_image_url} 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                muted
                                                playsInline
                                                onMouseEnter={(e) => e.currentTarget.play()}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.pause();
                                                    e.currentTarget.currentTime = 0;
                                                }}
                                            />
                                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                            </div>
                                        </div>
                                    ) : (
                                        <img
                                            src={post.main_image_url}
                                            alt={post.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                    )
                                ) : (
                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                    </div>
                                )}

                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/0 to-black/80" />

                                {/* Content Overlay */}
                                <div className="absolute inset-0 p-3 flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                            <span className="text-[10px] font-black">{post.rating}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="inline-block px-2 py-0.5 rounded bg-pink-600 text-[8px] font-black tracking-widest uppercase mb-1">
                                            {post.area}
                                        </span>
                                        <h3 className="text-xs font-black truncate drop-shadow-lg">
                                            {post.name.toUpperCase()}
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
}
