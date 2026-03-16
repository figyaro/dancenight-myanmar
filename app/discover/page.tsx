'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '../components/BottomNav';
import { supabase } from '../../lib/supabase';
import { isBunnyStream, getBunnyStreamThumbnailUrl, isVideo } from '../../lib/bunny';

interface Post {
    id: string;
    user_id: string;
    area: string;
    name: string;
    title: string;
    main_image_url: string;
    impressions_count?: number;
}

const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toString();
};

const sortTabs = [
    { id: 'newest', label: 'NEW' },
    { id: 'popular', label: 'POPULAR' },
    { id: 'interested', label: 'RECOMMENDED' },
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
            // Fetch posts with aggregated impression counts
            let query = supabase
                .from('posts')
                .select(`
                    *,
                    impressions:analytics_events(count)
                `)
                .eq('analytics_events.event_type', 'post_impression');

            if (activeTab === 'newest') {
                query = query.order('created_at', { ascending: false });
            } else if (activeTab === 'popular') {
                // Sorting by popularity will still be by rating or we could sort by impressions later
                query = query.order('id', { ascending: false });
            } else {
                query = query.order('id', { ascending: true });
            }

            const { data, error } = await query;
            if (error) throw error;
            
            // Map the nested count to a flat property
            const mappedPosts = (data || []).map((p: any) => ({
                ...p,
                impressions_count: p.impressions && p.impressions[0] ? p.impressions[0].count : 0
            }));

            // If popular tab, sort client-side by impressions_count for now
            if (activeTab === 'popular') {
                mappedPosts.sort((a, b) => (b.impressions_count || 0) - (a.impressions_count || 0));
            }

            setPosts(mappedPosts);
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
        if (loading || filteredPosts.length === 0) return;
        
        try {
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
        } catch (e) {
            console.error('Observer failed:', e);
        }
    }, [filteredPosts, loading]);

    return (
        <div className="bg-black min-h-screen text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-md mx-auto px-4 pt-6 pb-2">
                    <div className="flex items-center justify-between mb-8">
                        <div className="relative group">
                            <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 animate-gradient-x drop-shadow-[0_10px_20px_rgba(219,39,119,0.3)]">
                                DISCOVER
                            </h1>
                            <div className="absolute -bottom-2 left-0 w-12 h-1 bg-pink-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 shadow-[0_0_15px_rgba(219,39,119,0.5)]" />
                        </div>
                        <button 
                            onClick={() => setIsSearchVisible(!isSearchVisible)}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border relative overflow-hidden group ${isSearchVisible ? 'bg-pink-600 border-pink-500 text-white shadow-[0_0_30px_rgba(219,39,119,0.4)]' : 'bg-white/5 backdrop-blur-xl border-white/10 text-zinc-400 hover:border-white/20'}`}
                        >
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
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
                    <div className={`overflow-hidden transition-all duration-700 ease-in-out ${isSearchVisible ? 'max-h-24 opacity-100 mb-8' : 'max-h-0 opacity-0 mb-0'}`}>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-pink-500/10 blur-2xl scale-95 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                            <div className="relative">
                                <svg
                                    className="absolute left-5 top-1/2 -translate-y-1/2 text-pink-500/50 group-focus-within:text-pink-500 transition-colors"
                                    width="20"
                                    height="20"
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
                                    placeholder="Find your next vibe..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-sm font-bold placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/50 focus:ring-4 focus:ring-pink-500/10 transition-all shadow-inner"
                                />
                            </div>
                        </div>
                    </div>
 
                    {/* Sort Tabs - Liquid Style */}
                    <div className="flex gap-2 bg-white/5 backdrop-blur-md p-1.5 rounded-[1.25rem] border border-white/10 mb-2 shadow-2xl">
                        {sortTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black tracking-[0.2em] transition-all duration-500 relative overflow-hidden group ${activeTab === tab.id
                                    ? 'text-white'
                                    : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                {activeTab === tab.id && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 animate-gradient-x" />
                                )}
                                <span className="relative z-10">{tab.label}</span>
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
                                className="relative aspect-[9/16] rounded-2xl overflow-hidden group cursor-pointer active:scale-95 transition-transform bg-zinc-900"
                            >
                                <div className="absolute inset-0 z-20 border border-white/10 rounded-2xl pointer-events-none" />
                                {post.main_image_url ? (
                                    isBunnyStream(post.main_image_url) ? (
                                        <div className="relative w-full h-full">
                                            <img
                                                src={getBunnyStreamThumbnailUrl(post.main_image_url) || ''}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                alt={post.name}
                                            />
                                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                            </div>
                                        </div>
                                    ) : isVideo(post.main_image_url) ? (
                                        <div className="relative w-full h-full video-container">
                                            <video 
                                                src={post.main_image_url} 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                muted
                                                playsInline
                                                // @ts-ignore
                                                webkit-playsinline="true"
                                                onMouseEnter={(e) => e.currentTarget.play()}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.pause();
                                                    e.currentTarget.currentTime = 0;
                                                }}
                                                onTouchStart={(e) => {
                                                    e.currentTarget.play();
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

                                {/* Content Overlay - Liquid Glass Styling */}
                                <div className="absolute inset-0 p-4 flex flex-col justify-between z-30">
                                    <div className="flex justify-between items-start">
                                        <div className="bg-black/30 backdrop-blur-xl px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1.5 shadow-xl">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-pink-500">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                            <span className="text-[10px] font-black tracking-wider">{formatNumber(post.impressions_count || 0)}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="inline-block px-2 py-0.5 rounded-lg bg-pink-500/80 backdrop-blur-md text-[8px] font-black tracking-[0.2em] uppercase shadow-lg shadow-pink-900/40">
                                            {post.area}
                                        </span>
                                        <h3 className="text-xs font-black truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tight">
                                            {post.name.toUpperCase()}
                                        </h3>
                                    </div>
                                </div>
                                
                                {/* Hover Glow Effect */}
                                <div className="absolute inset-0 bg-gradient-to-t from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <BottomNav />
        </div>
    );
}
