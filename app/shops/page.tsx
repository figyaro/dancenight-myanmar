'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { t } from '../../lib/i18n';
import TopNav from '../components/TopNav';
import BottomNav from '../components/BottomNav';
import Link from 'next/link';
import { isBunnyStream, getBunnyStreamVideoUrl, isVideo } from '../../lib/bunny';

interface Shop {
    id: string;
    name: string;
    description: string;
    location: string;
    area?: string;
    main_image_url: string;
    category: string;
    plan?: { price_monthly: number } | null;
    recentPostCount?: number;
    recentPosts?: any[];
    isPaid?: boolean;
    randomSort?: number;
}

const CATEGORIES = ['All', 'Club', 'KTV', 'Restaurant&Bar', 'SPA', 'Others'];
const PAGE_SIZE = 12;

export default function Shops() {
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [language, setLanguage] = useState<string | null>('英語');
    const [activeCategory, setActiveCategory] = useState('All');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const observer = useRef<IntersectionObserver | null>(null);
    const lastShopElementRef = useCallback((node: HTMLDivElement | null) => {
        if (loading || loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, loadingMore, hasMore]);

    const fetchData = async (currentPage: number, reset: boolean = false) => {
        try {
            if (reset) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            // 1. Fetch language and user on initial load
            if (reset && currentPage === 0) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('language')
                        .eq('id', user.id)
                        .single();
                    if (userData?.language) setLanguage(userData.language);
                }
            }

            // 2. Build Base Query
            let query = supabase
                .from('shops')
                .select('*, plan:plans(price_monthly)', { count: 'exact' });

            // 3. Apply Filters
            if (activeCategory !== 'All') {
                query = query.eq('category', activeCategory);
            }
            if (searchQuery) {
                query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
            }

            // 4. Handle Sorting and Pagination
            const from = currentPage * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;
            
            // Note: We use ID as a stable sort to prevent duplicates in range-based pagination
            const { data: shopsData, count, error: shopsError } = await query
                .order('id', { ascending: true }) 
                .range(from, to);

            if (shopsError) throw shopsError;

            // 5. Fetch recent activity (posts count) for the current batch
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const shopIds = shopsData?.map(s => s.id) || [];
            let shopPosts: Record<string, any[]> = {};
            
            if (shopIds.length > 0) {
                const { data: postsData } = await supabase
                    .from('posts')
                    .select('id, shop_id, main_image_url, created_at')
                    .in('shop_id', shopIds)
                    .gte('created_at', thirtyDaysAgo.toISOString())
                    .order('created_at', { ascending: false });

                postsData?.forEach(post => {
                    if (!shopPosts[post.shop_id]) shopPosts[post.shop_id] = [];
                    shopPosts[post.shop_id].push(post);
                });
            }

            // 6. Process and Sort the new batch
            const processedShops = (shopsData || []).map(shop => {
                let monthlyPrice = 0;
                if (Array.isArray(shop.plan)) {
                    monthlyPrice = shop.plan[0]?.price_monthly || 0;
                } else if (shop.plan) {
                    monthlyPrice = shop.plan.price_monthly || 0;
                }
                const recentPosts = shopPosts[shop.id] || [];
                return {
                    ...shop,
                    recentPostCount: recentPosts.length,
                    recentPosts: recentPosts.slice(0, 5), // Keep up to 5 latest posts for thumbnails
                    isPaid: monthlyPrice > 0,
                };
            });

            // Locally sort the batch (Paid status priority)
            processedShops.sort((a, b) => (a.isPaid === b.isPaid ? 0 : a.isPaid ? -1 : 1));

            if (reset) {
                setShops(processedShops);
            } else {
                setShops(prev => [...prev, ...processedShops]);
            }
            
            setHasMore(count ? (from + processedShops.length < count) : false);

        } catch (err) {
            console.error('Error fetching shops:', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Effect for page changes (Infinite Scroll)
    useEffect(() => {
        if (page > 0) fetchData(page);
    }, [page]);

    // Effect for initial load and reset on activeCategory or searchQuery change
    useEffect(() => {
        setPage(0);
        fetchData(0, true);
    }, [activeCategory, searchQuery]);

    const toggleSearch = () => {
        setIsSearchOpen(!isSearchOpen);
        if (isSearchOpen) setSearchQuery('');
    };

    return (
        <div className="bg-black min-h-screen text-white relative overflow-x-hidden">
            {/* Liquid Background Blobs */}
            <div className={`fixed top-0 left-0 w-full h-full z-0 pointer-events-none opacity-30`}>
                <div className="absolute top-[10%] left-[-10%] w-[80%] h-[60%] bg-pink-600/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[10%] right-[-10%] w-[80%] h-[60%] bg-zinc-800/40 blur-[120px] rounded-full" />
            </div>

            <TopNav />
            
            <main className="relative z-10 pt-24 pb-32 px-4 max-w-md mx-auto min-h-screen">
                {/* Header Section */}
                <div className="mb-8 space-y-6">
                    <div className="flex justify-between items-end">
                        <div className="animate-in slide-in-from-left duration-1000">
                            <h1 className="text-4xl font-black tracking-tighter mb-1">
                                {t('shops', language)}
                            </h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-pink-500/80">Premium Guide</p>
                        </div>
                        <div className="flex gap-3 animate-in slide-in-from-right duration-1000">
                            <button 
                                onClick={toggleSearch}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isSearchOpen ? 'bg-pink-600 text-white shadow-xl shadow-pink-900/40' : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'}`}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    {isSearchOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>}
                                </svg>
                            </button>
                            <button 
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isFilterOpen ? 'bg-zinc-100 text-black shadow-xl' : 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white'}`}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="M3 6h18M7 12h10M10 18h4" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Search Bar Input */}
                    <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isSearchOpen ? 'max-h-20 opacity-100 mt-4' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                        <div className="relative group">
                            <input 
                                type="text"
                                placeholder="Search by name or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/50 focus:bg-white/10 transition-all shadow-2xl"
                            />
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-pink-500 transition-colors" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                            </svg>
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${isFilterOpen ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
                        <div className="flex flex-wrap gap-2 p-1.5 bg-zinc-900/30 backdrop-blur-3xl rounded-[2rem] border border-white/5 shadow-2xl">
                            {CATEGORIES.map(category => (
                                <button
                                    key={category}
                                    onClick={() => setActiveCategory(category)}
                                    className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                        activeCategory === category 
                                        ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/40' 
                                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
                                    }`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                {loading && page === 0 ? (
                    <div className="space-y-8">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-72 bg-zinc-900/40 rounded-[2.5rem] animate-pulse border border-white/5" />
                        ))}
                    </div>
                ) : shops.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 animate-in fade-in duration-1000">
                        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-4xl opacity-20">🔍</div>
                        <div>
                            <p className="text-zinc-400 font-black uppercase text-xs tracking-[0.2em] mb-1">No matching venues</p>
                            <p className="text-zinc-600 text-[10px] font-medium uppercase tracking-widest">Try resetting your filters</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {shops.map((shop, index) => (
                            <div 
                                key={shop.id} 
                                ref={index === shops.length - 1 ? lastShopElementRef : null}
                                className="group animate-in slide-in-from-bottom-12 fade-in duration-1000 fill-mode-both"
                                style={{ animationDelay: `${(index % 4) * 100}ms` }}
                            >
                                <Link href={`/shops/${shop.id}`} className="block relative">
                                    {/* Glassmorphic Card */}
                                    <div className="bg-zinc-900/40 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-white/10 hover:border-pink-500/30 transition-all duration-700 shadow-2xl active:scale-[0.98]">
                                        
                                        {/* Shop Image Section */}
                                        <div className="relative aspect-[16/10] overflow-hidden">
                                            {shop.main_image_url ? (
                                                <img 
                                                    src={shop.main_image_url} 
                                                    alt={shop.name} 
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3s] ease-out" 
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center space-y-3">
                                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
                                                    <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center text-3xl opacity-20 relative z-10">📸</div>
                                                    <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest relative z-10">No Brand Image</span>
                                                </div>
                                            )}
                                            
                                            {/* Lighting Overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90 shadow-inner" />
                                            
                                            {/* Status and Category Badges */}
                                            <div className="absolute top-6 left-6 flex gap-2">
                                                {shop.isPaid && (
                                                    <div className="px-4 py-1.5 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-xl flex items-center gap-2 backdrop-blur-md animate-in slide-in-from-left duration-700">
                                                        <span className="animate-pulse">⭐</span> Featured
                                                    </div>
                                                )}
                                                <div className="px-4 py-1.5 bg-black/40 text-white/80 text-[9px] font-black uppercase tracking-widest rounded-xl border border-white/10 backdrop-blur-md">
                                                    {shop.category || 'Premium'}
                                                </div>
                                            </div>

                                            {/* Header Overlay Info */}
                                            <div className="absolute bottom-6 left-8 right-8">
                                                <h2 className="text-3xl font-black text-white tracking-tighter mb-2 drop-shadow-2xl leading-none group-hover:translate-x-1 transition-transform duration-500">{shop.name}</h2>
                                                <div className="flex items-center gap-4 text-white/60 text-[10px] font-black uppercase tracking-widest">
                                                    <span className="flex items-center gap-2">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-pink-500">
                                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                                                        </svg>
                                                        {shop.area || shop.location}
                                                    </span>
                                                    {(shop.recentPostCount || 0) > 0 && (
                                                        <span className="flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                                                            {shop.recentPostCount} Recent Posts
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Action Arrow Overlay */}
                                            <div className="absolute bottom-6 right-8">
                                                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white group-hover:bg-pink-600 group-hover:border-pink-500 transition-all duration-500 shadow-xl group-active:scale-95 group-hover:shadow-pink-900/40">
                                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Shop Recent Posts Thumbnails */}
                                        <div className="px-8 py-5 flex items-center gap-3 overflow-x-auto scrollbar-hide">
                                            {shop.recentPosts && shop.recentPosts.length > 0 ? (
                                                <>
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-pink-500 whitespace-nowrap">Latest:</span>
                                                    {shop.recentPosts.map((post, i) => {
                                                        const mediaUrl = post.main_image_url;
                                                        return (
                                                            <Link href={`/home?postId=${post.id}&shopId=${shop.id}`} key={i} onClick={(e) => e.stopPropagation()}>
                                                                <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden border border-white/10 shrink-0 relative group-hover:border-pink-500/30 transition-colors shadow-lg hover:scale-110 duration-300">
                                                                    {mediaUrl ? (
                                                                        isBunnyStream(mediaUrl) || isVideo(mediaUrl) ? (
                                                                            <div className="w-full h-full relative">
                                                                                <video 
                                                                                    src={isBunnyStream(mediaUrl) ? getBunnyStreamVideoUrl(mediaUrl) || '' : mediaUrl} 
                                                                                    className="w-full h-full object-cover opacity-80"
                                                                                    muted playsInline preload="metadata"
                                                                                />
                                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <img src={mediaUrl} className="w-full h-full object-cover transition-transform duration-500 hover:scale-125" alt="" />
                                                                        )
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-[10px] opacity-40 grayscale">📸</div>
                                                                    )}
                                                                </div>
                                                            </Link>
                                                        );
                                                    })}
                                                    {(shop.recentPostCount || 0) > 5 && (
                                                        <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-[9px] font-black tracking-widest text-pink-500 shrink-0">
                                                            +{(shop.recentPostCount || 0) - 5}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-3 text-zinc-600">
                                                    <span className="text-[9px] font-black uppercase tracking-widest">No recent updates</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}

                        {/* Pagination / Loading State */}
                        {loadingMore && (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <div className="w-10 h-10 border-2 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
                                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em] ml-1">Loading More</span>
                            </div>
                        )}

                        {/* End of results message */}
                        {!hasMore && shops.length > 0 && (
                            <div className="py-24 text-center relative">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-[1px] bg-white/10" />
                                <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.6em]">End of Collection</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
            
            <BottomNav />
        </div>
    );
}
