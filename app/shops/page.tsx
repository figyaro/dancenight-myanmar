'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { t } from '../../lib/i18n';
import TopNav from '../components/TopNav';
import BottomNav from '../components/BottomNav';
import Link from 'next/link';

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
}

const CATEGORIES = ['All', 'Club', 'KTV', 'Restaurant&Bar', 'SPA', 'Others'];

export default function Shops() {
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState<string | null>('英語');
    const [activeCategory, setActiveCategory] = useState('All');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch language
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

                // Fetch shops with plan details
                const { data: shopsData, error: shopsError } = await supabase
                    .from('shops')
                    .select('*, plan:plans(price_monthly)');

                if (shopsError) throw shopsError;

                // Fetch posts from the last 30 days to calculate activity
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                const { data: postsData } = await supabase
                    .from('posts')
                    .select('shop_id')
                    .gte('created_at', thirtyDaysAgo.toISOString());

                // Calculate post counts per shop
                const postCounts: Record<string, number> = {};
                if (postsData) {
                    postsData.forEach(post => {
                        postCounts[post.shop_id] = (postCounts[post.shop_id] || 0) + 1;
                    });
                }

                // Process and Sort Shops
                // Priority 1: Paid Plan (price_monthly > 0)
                // Priority 2: Active Posts (higher count goes first)
                // Priority 3: Random Shuffle for ties
                
                let processedShops = (shopsData || []).map(shop => {
                    // Extract price_monthly safely, defaulting to 0 for free plans or unassigned
                    let monthlyPrice = 0;
                    if (Array.isArray(shop.plan)) {
                        monthlyPrice = shop.plan[0]?.price_monthly || 0;
                    } else if (shop.plan) {
                        monthlyPrice = shop.plan.price_monthly || 0;
                    }

                    return {
                        ...shop,
                        recentPostCount: postCounts[shop.id] || 0,
                        isPaid: monthlyPrice > 0,
                        // Add a stable random seed for ties to prevent jumping on every re-render, 
                        // but still distribute free shops. We use the shop ID as a seed conceptually.
                        randomSort: Math.random() 
                    };
                });

                processedShops.sort((a, b) => {
                    // 1. Paid Plan Status
                    if (a.isPaid && !b.isPaid) return -1;
                    if (!a.isPaid && b.isPaid) return 1;

                    // 2. Post Frequency
                    if (a.recentPostCount !== b.recentPostCount) {
                        return b.recentPostCount - a.recentPostCount;
                    }

                    // 3. Random within ties
                    return b.randomSort - a.randomSort;
                });

                setShops(processedShops);
            } catch (err) {
                console.error('Error fetching shops:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="bg-black min-h-screen text-white">
            <TopNav />
            <main className="pt-20 pb-24 px-4 max-w-md mx-auto relative">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">{t('shops', language)}</h1>
                    <button 
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isFilterOpen ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white'}`}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="21" x2="4" y2="14"></line>
                            <line x1="4" y1="10" x2="4" y2="3"></line>
                            <line x1="12" y1="21" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12" y2="3"></line>
                            <line x1="20" y1="21" x2="20" y2="16"></line>
                            <line x1="20" y1="12" x2="20" y2="3"></line>
                            <line x1="1" y1="14" x2="7" y2="14"></line>
                            <line x1="9" y1="8" x2="15" y2="8"></line>
                            <line x1="17" y1="16" x2="23" y2="16"></line>
                        </svg>
                    </button>
                </div>

                {/* Filter Categories */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isFilterOpen ? 'max-h-40 opacity-100 mb-6' : 'max-h-0 opacity-0 mb-0'}`}>
                    <div className="flex flex-wrap gap-2 p-1 bg-zinc-900/50 rounded-2xl border border-white/5">
                        {CATEGORIES.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`px-4 py-2 rounded-xl text-[10.5px] font-black uppercase tracking-widest transition-all ${
                                    activeCategory === category 
                                    ? 'bg-pink-600 text-white shadow-md' 
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin h-8 w-8 text-pink-500 border-4 border-t-transparent rounded-full"></div>
                    </div>
                ) : shops.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500">
                        <p>No shops found.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {shops.filter(s => activeCategory === 'All' || s.category === activeCategory).map((shop) => (
                            <Link href={`/shops/${shop.id}`} key={shop.id} className="block transition-transform active:scale-[0.98]">
                                <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors relative">
                                    {/* Promoted Badge (Optional visual indicator, could tie to plan level) */}
                                    {(shop as any).isPaid && (
                                        <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-black uppercase tracking-widest rounded-md shadow-lg flex items-center gap-1">
                                            <span>⭐</span> Featured
                                        </div>
                                    )}

                                    {shop.main_image_url ? (
                                        <div className="relative h-48 w-full">
                                            <img src={shop.main_image_url} alt={shop.name} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        </div>
                                    ) : (
                                        <div className="w-full h-48 bg-zinc-800 flex items-center justify-center text-zinc-600 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-20">
                                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                <polyline points="9 22 9 12 15 12 15 22" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="p-4 relative">
                                        <div className="absolute -top-6 right-4 px-3 py-1 bg-zinc-800 border border-zinc-700 text-pink-500 text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                            {shop.category || 'Premium'}
                                        </div>
                                        <div className="flex justify-between items-start mb-2">
                                            <h2 className="text-xl font-bold">{shop.name}</h2>
                                        </div>
                                        <p className="text-zinc-400 text-sm mb-3 line-clamp-2">{shop.description}</p>
                                        <div className="flex items-center justify-between text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                                            <span className="flex items-center text-zinc-400">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-1.5 opacity-70">
                                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                    <circle cx="12" cy="10" r="3" />
                                                </svg>
                                                {shop.area || shop.location}
                                            </span>
                                            {(shop.recentPostCount || 0) > 0 && (
                                                <span className="text-pink-500/80">
                                                    {shop.recentPostCount} Posts (30d)
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {shops.filter(s => activeCategory === 'All' || s.category === activeCategory).length === 0 && (
                            <div className="text-center py-12 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                                No shops in this category yet.
                            </div>
                        )}
                    </div>
                )}
            </main>
            <BottomNav />
        </div>
    );
}

