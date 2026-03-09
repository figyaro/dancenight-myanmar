'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '../components/BottomNav';
import TopNav from '../components/TopNav';
import { supabase } from '../../lib/supabase';
import { t } from '../../lib/i18n';

interface Post {
    id: number;
    user_id: string;
    area: string;
    name: string;
    title: string;
    price_per_hour: number;
    currency: string;
    rating: number;
    main_image_url: string;
    location_name: string;
    shop_id?: string;
}

function HomeFeedContent() {
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState<string | null>('英語');
    const [expandedPost, setExpandedPost] = useState<number | null>(null);
    const [likes, setLikes] = useState<Record<number, number>>({});
    const searchParams = useSearchParams();
    const postIdParam = searchParams.get('postId');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const postRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const touchStartX = useRef<number | null>(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch language first
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('language')
                        .eq('id', user.id)
                        .single();
                    if (userData?.language) {
                        setLanguage(userData.language);
                    }
                }

                // Then fetch posts
                const { data, error } = await supabase
                    .from('posts')
                    .select('*')
                    .order('id', { ascending: false });

                if (error) throw error;
                if (data) {
                    setPosts(data);
                    // Initialize some fake likes
                    const initialLikes: Record<number, number> = {};
                    data.forEach(p => initialLikes[p.id] = Math.floor(Math.random() * 2000) + 500);
                    setLikes(initialLikes);
                }
            } catch (err) {
                console.error("エラー: データの取得に失敗しました", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    // Handle scroll to specific post if postId is provided
    useEffect(() => {
        if (!loading && posts.length > 0 && postIdParam) {
            const targetId = parseInt(postIdParam);
            const targetElement = postRefs.current[targetId];
            if (targetElement && scrollContainerRef.current) {
                targetElement.scrollIntoView({ behavior: 'auto' });
            }
        }
    }, [loading, posts, postIdParam]);

    const handleLike = (postId: number) => {
        setLikes(prev => ({
            ...prev,
            [postId]: (prev[postId] || 0) + 1
        }));
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent, postId: number) => {
        if (touchStartX.current !== null) {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchEndX - touchStartX.current;
            // Right swipe (diff > 50) to close expansion
            if (diff > 50 && expandedPost === postId) {
                setExpandedPost(null);
            }
        }
        touchStartX.current = null;
    };

    return (
        <div className="bg-black text-white h-[100dvh] w-full overflow-hidden relative">
            <TopNav />

            {/* Main Feed */}
            <div
                ref={scrollContainerRef}
                className="absolute inset-0 snap-y snap-mandatory overflow-y-scroll scrollbar-hide bg-black overscroll-none"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {loading && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                        <div className="animate-spin h-8 w-8 mb-4 border-4 border-pink-500 border-t-transparent rounded-full" />
                        <p className="text-xs font-bold tracking-widest uppercase">{t('loading_posts', language)}</p>
                    </div>
                )}
                {!loading && posts.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                        <p>{t('no_posts', language)}</p>
                    </div>
                )}
                {!loading && posts.map((post) => (
                    <div
                        key={post.id}
                        ref={el => { postRefs.current[post.id] = el; }}
                        className="h-[100dvh] w-full snap-start snap-always relative bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0"
                    >
                        {post.main_image_url ? (
                            <img src={post.main_image_url} className="absolute inset-0 w-full h-full object-cover" alt={post.name} />
                        ) : (
                            <div className="absolute inset-0 w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600">
                                <span>NO IMAGE</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/80" />

                        {/* Info Area (Adjusted for refined look) */}
                        <div className="absolute bottom-28 left-4 right-16 pointer-events-none">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="bg-white/10 backdrop-blur-md border border-white/10 text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
                                    {post.area}
                                </span>
                                <div className="bg-yellow-400/90 text-black px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    {post.rating}
                                </div>
                            </div>
                            <h2 className="text-2xl font-black mb-1 drop-shadow-lg">{post.name}</h2>
                            <p className="text-base mb-2 drop-shadow-md text-zinc-200 line-clamp-1">{post.title}</p>
                            <div className="flex items-center gap-3">
                                <p className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-300 text-2xl font-black">{post.price_per_hour} <span className="text-sm font-bold uppercase">{post.currency}</span></p>
                                <p className="flex items-center gap-1 text-[11px] text-zinc-400 font-semibold bg-black/40 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/5">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                    {post.location_name}
                                </p>
                            </div>
                        </div>

                        {/* Side Interaction Menu */}
                        <div className="absolute bottom-28 right-4 flex flex-col gap-6 items-end w-48 pointer-events-none">
                            {/* Profile Link (Points to Author Profile) */}
                            <div className="pointer-events-auto">
                                <Link
                                    href={post.user_id ? `/profile/${post.user_id}` : '#'}
                                    className="relative group active:scale-95 transition-transform mr-1 block"
                                >
                                    <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-500 animate-gradient-xy">
                                        <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-zinc-800">
                                            <img
                                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id || post.name}`}
                                                className="w-full h-full object-cover"
                                                alt="Profile"
                                            />
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-pink-600 text-[8px] font-black px-1 rounded-full border border-black">+</div>
                                </Link>
                            </div>

                            {/* Like Button */}
                            <button
                                onClick={() => handleLike(post.id)}
                                className="flex flex-col items-center group active:scale-90 transition-transform mr-3 pointer-events-auto"
                            >
                                <div className="text-white drop-shadow-md group-active:text-pink-500 transition-colors">
                                    <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" className="opacity-90"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                </div>
                                <span className="text-[11px] font-black drop-shadow-md">{likes[post.id]?.toLocaleString() || '0'}</span>
                            </button>

                            {/* Comment Button */}
                            <button className="flex flex-col items-center group active:scale-90 transition-transform mr-3 pointer-events-auto">
                                <div className="text-white drop-shadow-md">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="opacity-90"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                                </div>
                                <span className="text-[11px] font-black drop-shadow-md">124</span>
                            </button>

                            {/* Share Button */}
                            <button className="flex flex-col items-center group active:scale-90 transition-transform mr-3 pointer-events-auto">
                                <div className="text-white drop-shadow-md">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="opacity-90"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                                </div>
                                <span className="text-[11px] font-black drop-shadow-md">{t('share', language)}</span>
                            </button>

                            {/* Sophisticated Rsv Button - Right Fixed, Expands Left */}
                            <div
                                className="relative flex items-center justify-end w-full min-h-[56px] pointer-events-auto"
                                onTouchStart={handleTouchStart}
                                onTouchEnd={(e) => handleTouchEnd(e, post.id)}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (expandedPost === post.id) {
                                            router.push(`/chat?tab=requests&shop=${post.id}`);
                                        } else {
                                            setExpandedPost(post.id);
                                        }
                                    }}
                                    className={`relative z-20 flex items-center justify-center transition-all duration-500 ease-out overflow-hidden shadow-2xl h-14 ${expandedPost === post.id
                                        ? 'w-48 bg-gradient-to-r from-pink-600 to-rose-500 rounded-2xl px-6'
                                        : 'w-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full'
                                        }`}
                                >
                                    {expandedPost === post.id ? (
                                        <span className="text-white font-black text-sm tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-right-4 duration-500">
                                            {t('reserve_tonight', language).toUpperCase()}
                                        </span>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-black tracking-tighter text-pink-500 leading-none">RSV</span>
                                            <div className="w-1 h-1 bg-white rounded-full mt-0.5 animate-pulse" />
                                        </div>
                                    )}
                                </button>

                                {expandedPost === post.id && (
                                    <div className="absolute right-[105%] text-zinc-400 animate-in fade-in slide-in-from-right-2 duration-700 pointer-events-none">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-bounce-x">
                                            <path d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                ))}
            </div>

            <BottomNav />

        </div>
    );
}

export default function HomeFeed() {
    return (
        <Suspense fallback={
            <div className="bg-black h-screen w-full flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-pink-500 border-t-transparent rounded-full" />
            </div>
        }>
            <HomeFeedContent />
        </Suspense>
    );
}

