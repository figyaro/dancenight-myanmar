'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '../components/BottomNav';
import TopNav from '../components/TopNav';
import { supabase } from '../../lib/supabase';
import { getEffectiveUserId } from '../../lib/auth-util';
import { t } from '../../lib/i18n';
import { trackAnalyticsEvent } from '../../lib/analytics';
import LoadingScreen from '../components/LoadingScreen';
import VolumeDial from '../components/VolumeDial';
import { isBunnyStream, getBunnyStreamVideoUrl, getBunnyStreamEmbedUrl, extractBunnyVideoId } from '../../lib/bunny';

interface UserProfile {
    nickname: string;
    avatar_url: string;
    role: string;
}

interface Post {
    id: string; // Changed from number to string (UUID)
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
    users?: UserProfile; // Added for joined profile info
    created_at?: string;
}

interface Comment {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    users: {
        nickname: string;
        avatar_url: string;
    };
}

function HomeFeedContent() {
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState<string | null>('英語');
    const [expandedPost, setExpandedPost] = useState<string | null>(null);
    const [likes, setLikes] = useState<Record<string, number>>({});
    const [userLikes, setUserLikes] = useState<string[]>([]);
    const [user, setUser] = useState<any>(null);
    const [userId, setUserId] = useState<string | null>(null); // Added userId state
    const [activePostId, setActivePostId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [visibilityRatios, setVisibilityRatios] = useState<Record<string, number>>({});
    
    // Video Processing Status State
    const [videoStatusMap, setVideoStatusMap] = useState<Record<string, { ready: boolean; encodeProgress: number }>>({});
    const pollingStateRef = useRef<Record<string, 'polling' | 'ready'>>({});
    
    // Audio State
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1.0);
    const [hasInteracted, setHasInteracted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(true);
    const [faintIcon, setFaintIcon] = useState<'play' | 'pause' | null>(null);
    const iconTimerRef = useRef<NodeJS.Timeout | null>(null);
    
    // Social Modal State
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [currentPost, setCurrentPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
    const [followingIds, setFollowingIds] = useState<string[]>([]);

    const searchParams = useSearchParams();
    const postIdParam = searchParams.get('postId');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const postRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const touchStartX = useRef<number | null>(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Use getSession() instead of getUser() for better performance and stability
                const { data: { session } } = await supabase.auth.getSession();
                const authUser = session?.user || null;
                setUser(authUser);

                // Get effective user ID (could be impersonated)
                // In client-side, we check sessionStorage first
                const impersonatedId = typeof window !== 'undefined' ? sessionStorage.getItem('impersonatedId') : null;
                const effectiveUserId = impersonatedId || authUser?.id || null;
                setUserId(effectiveUserId);
                
                if (effectiveUserId) {
                    // Fetch language for the effective user
                    const { data: userData } = await supabase
                        .from('users')
                        .select('language')
                        .eq('id', effectiveUserId)
                        .single();
                    if (userData?.language) {
                        setLanguage(userData.language);
                    }

                    // Fetch following list for the effective user
                    const { data: followsData } = await supabase.from('follows').select('following_id').eq('follower_id', effectiveUserId);
                    if (followsData) setFollowingIds(followsData.map(f => f.following_id));
                }

                // Fetch recommended posts using RPC
                // Ensure effectiveUserId is a valid UUID to avoid 400 errors
                const isValidUUID = (id: string | null) => {
                    if (!id) return false;
                    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    return uuidPattern.test(id);
                };

                const { data, error } = await supabase
                    .rpc('get_recommended_posts_v2', { p_viewer_id: isValidUUID(effectiveUserId) ? effectiveUserId : null });

                if (error) {
                    console.warn("RPC failed, falling back to standard query", error);
                    // Fallback
                    const { data: fallbackData, error: fallbackError } = await supabase
                        .from('posts')
                        .select('*, users(nickname, avatar_url, role)')
                        .order('created_at', { ascending: false });
                    
                    if (fallbackError) throw fallbackError;
                    setPosts(fallbackData as Post[]);
                } else if (data) {
                    const mappedData = data.map((item: any) => ({
                        id: item.out_id,
                        user_id: item.out_user_id,
                        area: item.out_area,
                        name: item.out_name,
                        title: item.out_title,
                        price_per_hour: item.out_price_per_hour,
                        currency: item.out_currency,
                        rating: item.out_rating,
                        main_image_url: item.out_main_image_url,
                        location_name: item.out_location_name,
                        shop_id: item.out_shop_id,
                        created_at: item.out_created_at,
                        users: item.out_users,
                        score: item.out_score
                    }));
                    setPosts(mappedData as Post[]);
                }

                if (data || posts.length > 0) {
                    // Fetch real-time likes
                    const { data: likesData } = await supabase.from('likes').select('post_id');
                    const counts: Record<string, number> = {};
                    likesData?.forEach(l => counts[l.post_id] = (counts[l.post_id] || 0) + 1);
                    setLikes(counts);

                    if (effectiveUserId) {
                        const { data: userLikesData } = await supabase.from('likes').select('post_id').eq('user_id', effectiveUserId);
                        if (userLikesData) setUserLikes(userLikesData.map(l => l.post_id));

                        // Fetch following list for the effective user
                        const { data: followsData } = await supabase.from('follows').select('following_id').eq('follower_id', effectiveUserId);
                        if (followsData) setFollowingIds(followsData.map(f => f.following_id));
                    }

                    // Fetch comment counts
                    try {
                        const { data: commentsData } = await supabase.from('comments').select('post_id');
                        const cCounts: Record<string, number> = {};
                        commentsData?.forEach(c => cCounts[c.post_id] = (cCounts[c.post_id] || 0) + 1);
                        setCommentCounts(cCounts);
                    } catch (cErr) {
                        console.warn('Comments table might not exist yet', cErr);
                    }

                    const initialPosts = data || posts;
                    if (initialPosts.length > 0) {
                        setTimeout(() => setActivePostId(initialPosts[0].id), 300);
                    }
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
            const targetElement = postRefs.current[postIdParam];
            if (targetElement && scrollContainerRef.current) {
                targetElement.scrollIntoView({ behavior: 'auto' });
            }
        }
    }, [loading, posts, postIdParam]);

    const handleLike = async (postId: string) => {
        if (!user || actionLoading) return;
        setActionLoading(true);

        const isLiked = userLikes.includes(postId);

        // Optimistic update
        setUserLikes(prev => isLiked ? prev.filter(id => id !== postId) : [...prev, postId]);
        setLikes(prev => ({
            ...prev,
            [postId]: (prev[postId] || 0) + (isLiked ? -1 : 1)
        }));

        try {
            if (isLiked) {
                await supabase.from('likes').delete().eq('user_id', user.id).eq('post_id', postId);
            } else {
                await supabase.from('likes').insert([{ user_id: user.id, post_id: postId }]);
                trackAnalyticsEvent({ 
                    postId, 
                    shopId: posts.find(p => p.id === postId)?.shop_id,
                    eventType: 'like_click' 
                });
            }
        } catch (err) {
            console.error('Error toggling like:', err);
            // Revert on error
            setUserLikes(prev => isLiked ? [...prev, postId] : prev.filter(id => id !== postId));
            setLikes(prev => ({
                ...prev,
                [postId]: (prev[postId] || 0) + (isLiked ? 1 : -1)
            }));
        } finally {
            setActionLoading(false);
        }
    };

    const fetchComments = async (postId: string) => {
        const { data, error } = await supabase
            .from('comments')
            .select('*, users(nickname, avatar_url)')
            .eq('post_id', postId)
            .order('created_at', { ascending: false });
        
        if (!error && data) {
            setComments(data as Comment[]);
        }
    };

    const handleOpenComments = (post: Post) => {
        setCurrentPost(post);
        setComments([]);
        fetchComments(post.id);
        setIsCommentModalOpen(true);
    };

    const handleSubmitComment = async () => {
        if (!user || !currentPost || !newComment.trim() || isSubmittingComment) return;
        setIsSubmittingComment(true);

        try {
            const { data, error } = await supabase
                .from('comments')
                .insert([{
                    post_id: currentPost.id,
                    user_id: user.id,
                    content: newComment.trim()
                }])
                .select('*, users(nickname, avatar_url)')
                .single();

            if (!error && data) {
                setComments(prev => [data as Comment, ...prev]);
                trackAnalyticsEvent({ 
                    postId: currentPost.id, 
                    shopId: currentPost.shop_id,
                    eventType: 'comment_click' 
                });
                setNewComment("");
                setCommentCounts(prev => ({
                    ...prev,
                    [currentPost.id]: (prev[currentPost.id] || 0) + 1
                }));
            }
        } catch (err) {
            console.error('Error adding comment:', err);
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent, postId: string) => {
        if (touchStartX.current !== null) {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchEndX - touchStartX.current;
            if (diff > 50 && expandedPost === postId) {
                setExpandedPost(null);
            }
        }
        touchStartX.current = null;
    };

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const vh = container.clientHeight;
        const scrollTop = container.scrollTop;

        const newRatios: Record<string, number> = {};
        posts.forEach((post, index) => {
            const postTop = index * vh;
            const distance = Math.abs(scrollTop - postTop);
            const progress = Math.max(0, 1 - (distance / vh));
            newRatios[post.id] = progress;
        });

        setVisibilityRatios(newRatios);

        const activeIndex = Math.round(scrollTop / vh);
        const currentPost = posts[activeIndex];
        if (currentPost && currentPost.id !== activePostId) {
            setActivePostId(currentPost.id);
        }
    };

    useEffect(() => {
        if (posts.length > 0) handleScroll();
    }, [posts]);

    // Poll Bunny Stream API for newly uploaded videos
    useEffect(() => {
        const isProbablyReady = (createdAt?: string) => {
            if (!createdAt) return false;
            // If older than 5 minutes, assume it's completely processed to save API calls
            return Date.now() - new Date(createdAt).getTime() > 5 * 60 * 1000;
        };

        posts.forEach(post => {
            if (!post.main_image_url || !isBunnyStream(post.main_image_url)) return;
            if (isProbablyReady(post.created_at as string)) return; // Use fallback rendering
            
            const videoId = extractBunnyVideoId(post.main_image_url);
            if (!videoId) return;

            if (pollingStateRef.current[post.id]) return; // Already polling or known ready
            
            pollingStateRef.current[post.id] = 'polling';

            const pollStatus = async () => {
                try {
                    const res = await fetch(`/api/media/status?videoId=${videoId}`);
                    if (res.ok) {
                        const data = await res.json();
                        setVideoStatusMap(prev => ({
                            ...prev,
                            [post.id]: { ready: data.ready, encodeProgress: data.encodeProgress || 0 }
                        }));

                        if (data.ready) {
                            pollingStateRef.current[post.id] = 'ready';
                            return; // Stop polling
                        }
                    }
                } catch (e) {
                    console.warn("Polling error", e);
                }
                setTimeout(pollStatus, 3000);
            };

            pollStatus();
        });
    }, [posts]);

    // Reset play state and track impressions only when the active post actually changes
    useEffect(() => {
        if (activePostId) {
            setIsPlaying(true);
            setFaintIcon(null);

            // Impression tracking logic
            const impressionTimer = setTimeout(async () => {
                if (!userId || !activePostId) return;
                try {
                    const post = posts.find(p => p.id === activePostId);
                    trackAnalyticsEvent({ 
                        postId: activePostId, 
                        shopId: post?.shop_id,
                        eventType: 'post_impression' 
                    });
                } catch (err) {
                    // Silently fail if already seen or network error
                }
            }, 2000); // 2 seconds spent on post = seen

            return () => clearTimeout(impressionTimer);
        }
    }, [activePostId, userId]);

    // Play/Pause video based on activePostId and isPlaying state
    useEffect(() => {
        if (!activePostId) return;

        const timer = setTimeout(() => {
            Object.entries(postRefs.current).forEach(([id, container]) => {
                const video = container?.querySelector('video');
                const iframe = container?.querySelector('iframe');

                if (id === activePostId) {
                    if (video) {
                        if (isPlaying) {
                            video.play().catch(err => console.warn("Auto-play blocked:", err));
                        } else {
                            video.pause();
                        }
                        video.muted = !hasInteracted || isMuted;
                        video.volume = volume;
                    }
                    if (iframe && iframe.contentWindow) {
                        try {
                            const win = iframe.contentWindow;
                            // Send multiple times to ensure internal player script catches it if booting up
                            const sendPlay = () => {
                                if (isPlaying) win.postMessage(JSON.stringify({ method: 'play' }), '*');
                                if (!hasInteracted || isMuted) {
                                    win.postMessage(JSON.stringify({ method: 'mute' }), '*');
                                } else {
                                    win.postMessage(JSON.stringify({ method: 'unmute' }), '*');
                                    win.postMessage(JSON.stringify({ method: 'setVolume', value: volume * 100 }), '*');
                                }
                            };
                            
                            sendPlay();
                            setTimeout(sendPlay, 500);
                            setTimeout(sendPlay, 1000);
                            setTimeout(sendPlay, 2000);
                        } catch (e) {
                            console.warn("Iframe interaction error:", e);
                        }
                    }
                } else {
                    if (video) {
                        video.pause();
                        video.currentTime = 0;
                    }
                    if (iframe && iframe.contentWindow) {
                        try {
                            iframe.contentWindow.postMessage(JSON.stringify({ method: 'pause' }), '*');
                            iframe.contentWindow.postMessage(JSON.stringify({ method: 'setCurrentTime', value: 0 }), '*');
                        } catch (e) {}
                    }
                }
            });
        }, 100);

        return () => clearTimeout(timer);
    }, [activePostId, hasInteracted, isMuted, volume, posts, isPlaying]);

    const togglePlay = (e: React.MouseEvent | React.TouchEvent) => {
        // Only toggle if not clicking on interaction menu/buttons
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a')) return;

        const currentPost = posts.find(p => p.id === activePostId);
        const isPostVideo = currentPost && currentPost.main_image_url && (isBunnyStream(currentPost.main_image_url) || currentPost.main_image_url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/));
        if (!isPostVideo) return; // Ignore taps on images

        if (!hasInteracted) setHasInteracted(true);
        
        const newState = !isPlaying;
        setIsPlaying(newState);
        setFaintIcon(newState ? 'play' : 'pause');

        if (iconTimerRef.current) clearTimeout(iconTimerRef.current);
        iconTimerRef.current = setTimeout(() => setFaintIcon(null), 1200);
    };

    return (
        <div className="bg-black text-white h-[100dvh] w-full overflow-hidden relative">
            <style jsx global>{`
                @keyframes heartbeat {
                    0% { transform: scale(1); }
                    15% { transform: scale(1.3); }
                    30% { transform: scale(1); }
                    45% { transform: scale(1.2); }
                    60% { transform: scale(1); }
                }
                .animate-heartbeat {
                    animation: heartbeat 0.6s ease-in-out;
                    color: #ec4899 !important;
                }
                .animate-icon-entry {
                    animation: icon-entry 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
                }
                @keyframes icon-entry {
                    0% { transform: scale(0.5) rotate(-10deg); opacity: 0; }
                    100% { transform: scale(1) rotate(0); opacity: 1; }
                }
                .animate-text-entry {
                    animation: text-entry 0.6s cubic-bezier(0.23, 1, 0.32, 1) both;
                }
                @keyframes text-entry {
                    0% { transform: translateY(10px); opacity: 0; filter: blur(4px); }
                    100% { transform: translateY(0); opacity: 1; filter: blur(0); }
                }
                @keyframes gradient-shift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
            `}</style>

            <TopNav />

            {/* Main Feed */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                onClick={togglePlay}
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
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-black">
                        <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-8 text-4xl grayscale opacity-30">🪩</div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-white mb-2">No posts yet</h2>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] mb-10 leading-relaxed">Designing the next viral moment...<br/>Be the first to share your world.</p>
                        <Link 
                            href="/post"
                            className="px-10 py-5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-2xl text-[10px] font-black tracking-[0.3em] transition-all uppercase shadow-[0_20px_40px_rgba(236,72,153,0.3)] active:scale-95"
                        >
                            Share your first update
                        </Link>
                    </div>
                )}
                {!loading && posts.map((post) => (
                    <div
                        key={post.id}
                        ref={el => { postRefs.current[post.id] = el; }}
                        className="h-[100dvh] w-full snap-start snap-always relative bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0"
                    >
                        {post.main_image_url ? (
                            isBunnyStream(post.main_image_url) ? (
                                <div className="absolute inset-0 w-full h-full bg-black overflow-hidden flex items-center justify-center">
                                    <div className={`absolute inset-0 transition-opacity duration-1000 ${videoStatusMap[post.id]?.ready === false ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}>
                                        <iframe
                                            src={getBunnyStreamEmbedUrl(post.main_image_url, false) || ''}
                                            loading="lazy"
                                            style={{ border: 0, width: '100%', height: '100%' }}
                                            className="w-full h-full object-cover pointer-events-none" 
                                            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                                            allowFullScreen
                                            onLoad={(e) => {
                                                if (activePostId === post.id && isPlaying) {
                                                    const win = e.currentTarget.contentWindow;
                                                    const sendPlay = () => {
                                                        win?.postMessage(JSON.stringify({ method: 'play' }), '*');
                                                        if (!hasInteracted || isMuted) {
                                                            win?.postMessage(JSON.stringify({ method: 'mute' }), '*');
                                                        }
                                                    };
                                                    sendPlay();
                                                    setTimeout(sendPlay, 500);
                                                    setTimeout(sendPlay, 1000);
                                                    setTimeout(sendPlay, 2000);
                                                }
                                            }}
                                        ></iframe>
                                    </div>

                                    {/* Video Processing Overlay */}
                                    {videoStatusMap[post.id]?.ready === false && (
                                        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in duration-500">
                                            <div className="relative w-24 h-24 mb-6">
                                                <svg className="animate-spin w-full h-full text-zinc-800" viewBox="0 0 100 100">
                                                    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" />
                                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#ec4899" strokeWidth="4" strokeDasharray="283" strokeDashoffset={283 - (283 * ((videoStatusMap[post.id]?.encodeProgress || 0) / 100))} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-pink-500 font-black text-xl">{videoStatusMap[post.id]?.encodeProgress || 0}%</span>
                                                </div>
                                            </div>
                                            <h3 className="text-white font-black tracking-widest text-lg uppercase mb-2">Video Processing</h3>
                                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] animate-pulse text-center leading-relaxed">Designing the next viral moment...<br/>Get ready to dance.</p>
                                        </div>
                                    )}
                                </div>
                            ) : post.main_image_url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) ? (
                                <div className="absolute inset-0 w-full h-full bg-black overflow-hidden flex items-center justify-center">
                                    <video 
                                        className="w-full h-full object-cover"
                                        playsInline
                                        muted
                                        loop
                                        autoPlay
                                        preload="auto"
                                    >
                                        <source src={post.main_image_url} type="video/mp4" />
                                    </video>
                                </div>
                            ) : (
                                <div className="absolute inset-0 w-full h-full bg-black overflow-hidden flex items-center justify-center">
                                    <img 
                                        src={post.main_image_url} 
                                        className="w-full h-full object-cover" 
                                        alt={post.name} 
                                    />
                                </div>
                            )
                        ) : (
                            <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center text-zinc-600">
                                <span className="font-black tracking-tighter opacity-20 text-4xl">DANCE NIGHT</span>
                            </div>
                        )}

                        {/* Play/Pause Center Icon Overlay - Centered with animation */}
                        {activePostId === post.id && faintIcon && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100]">
                                <div className="bg-black/30 backdrop-blur-md p-6 rounded-3xl animate-in zoom-in fade-out duration-1000 ease-out fill-mode-forwards shadow-2xl border border-white/5">
                                    {faintIcon === 'play' ? (
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="white" className="opacity-70 translate-x-0.5">
                                            <path d="M7 6v12l10-6z" stroke="white" strokeWidth="1" strokeLinejoin="round" />
                                        </svg>
                                    ) : (
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="white" className="opacity-70">
                                            <rect x="6" y="5" width="3" height="14" rx="1" />
                                            <rect x="15" y="5" width="3" height="14" rx="1" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        )}
                        <div
                            className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/90"
                            style={{ opacity: visibilityRatios[post.id] ?? 0 }}
                        />

                        {/* Info Area */}
                        <div
                            className="absolute bottom-28 left-4 right-16 pointer-events-none"
                            style={{
                                opacity: visibilityRatios[post.id] ?? 0,
                                transform: `translateY(${(1 - (visibilityRatios[post.id] ?? 0)) * 20}px)`,
                                transition: 'opacity 0.2s linear'
                            }}
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`bg-black/40 backdrop-blur-md border border-white/10 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${activePostId === post.id ? 'animate-text-entry' : 'opacity-0'}`} style={{ animationDelay: '0.4s' }}>
                                    {post.area}
                                </span>
                                <div className={`bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 shadow-lg ${activePostId === post.id ? 'animate-text-entry' : 'opacity-0'}`} style={{ animationDelay: '0.45s' }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    {post.rating}
                                </div>
                            </div>
                            <h2 className={`text-3xl font-black mb-1 drop-shadow-2xl ${activePostId === post.id ? 'animate-text-entry' : 'opacity-0'}`} style={{ animationDelay: '0.5s' }}>{post.name}</h2>
                            <p className={`text-base mb-3 drop-shadow-md text-zinc-200 line-clamp-1 font-medium ${activePostId === post.id ? 'animate-text-entry' : 'opacity-0'}`} style={{ animationDelay: '0.55s' }}>{post.title}</p>
                            <div className="flex items-center gap-3">
                                {post.price_per_hour !== null && post.price_per_hour !== undefined && post.price_per_hour > 0 ? (
                                    <p className={`text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-300 text-2xl font-black ${activePostId === post.id ? 'animate-text-entry' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }}>
                                        {post.price_per_hour.toLocaleString()} <span className="text-xs font-bold uppercase">{post.currency || 'MMK'}</span>
                                    </p>
                                ) : (
                                    <p className={`text-zinc-400 text-sm font-black tracking-widest uppercase ${activePostId === post.id ? 'animate-text-entry' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }}>
                                        EXCLUSIVE REVEAL
                                    </p>
                                )}
                                <p className={`flex items-center gap-1 text-[10px] text-zinc-300 font-black tracking-widest uppercase bg-white/5 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10 ${activePostId === post.id ? 'animate-text-entry' : 'opacity-0'}`} style={{ animationDelay: '0.65s' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                    {post.location_name}
                                </p>
                            </div>
                        </div>

                        {/* Interaction Menu */}
                        <div
                            className="absolute bottom-28 right-4 flex flex-col gap-5 items-center w-14 pointer-events-auto"
                            style={{
                                opacity: visibilityRatios[post.id] ?? 0,
                                transform: `translateX(${(1 - (visibilityRatios[post.id] ?? 0)) * 20}px)`,
                                transition: 'opacity 0.1s linear'
                            }}
                        >
                            {/* Profile Pic */}
                            <div className={`${activePostId === post.id ? 'animate-icon-entry' : 'opacity-0'}`} style={{ animationDelay: '0.1s' }}>
                                <Link href={`/profile/${post.user_id}`} className="relative group active:scale-90 transition-transform block">
                                    <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-500">
                                        <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-zinc-900">
                                            {post.users?.avatar_url ? (
                                                <img
                                                    src={post.users.avatar_url}
                                                    className="w-full h-full object-cover"
                                                    alt="Profile"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-800">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                        <circle cx="12" cy="7" r="4" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-pink-600 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-black">+</div>
                                </Link>
                            </div>

                            {/* Like */}
                            <button
                                onClick={() => handleLike(post.id)}
                                className={`flex flex-col items-center group active:scale-75 transition-transform ${activePostId === post.id ? 'animate-icon-entry' : 'opacity-0'}`}
                                style={{ animationDelay: '0.2s' }}
                            >
                                <div className={`drop-shadow-lg transition-all duration-300 ${userLikes.includes(post.id) ? 'animate-heartbeat text-pink-500' : 'text-white'}`}>
                                    <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                </div>
                                <span className={`text-[11px] font-black drop-shadow-md mt-1 transition-colors ${userLikes.includes(post.id) ? 'text-pink-400' : 'text-zinc-300'}`}>
                                    {likes[post.id]?.toLocaleString() || '0'}
                                </span>
                            </button>

                            {/* Comment */}
                            <button
                                onClick={() => handleOpenComments(post)}
                                className={`flex flex-col items-center group active:scale-90 transition-transform ${activePostId === post.id ? 'animate-icon-entry' : 'opacity-0'}`}
                                style={{ animationDelay: '0.3s' }}
                            >
                                <div className="text-white drop-shadow-lg">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                                </div>
                                <span className="text-[11px] font-black drop-shadow-md mt-1 text-zinc-300">
                                    {commentCounts[post.id]?.toLocaleString() || '0'}
                                </span>
                            </button>

                            {/* Share */}
                            <button
                                onClick={() => { setCurrentPost(post); setIsShareModalOpen(true); }}
                                className={`flex flex-col items-center group active:scale-90 transition-transform ${activePostId === post.id ? 'animate-icon-entry' : 'opacity-0'}`}
                                style={{ animationDelay: '0.4s' }}
                            >
                                <div className="text-white drop-shadow-lg">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                                </div>
                                <span className="text-[11px] font-black drop-shadow-md mt-1 text-zinc-300 uppercase tracking-tighter">Share</span>
                            </button>

                            {/* Interaction Button (RSV for Dancers / Message for Users) */}
                            <div
                                className={`relative flex items-center justify-end w-full min-h-[56px] ${activePostId === post.id ? 'animate-icon-entry' : 'opacity-0'}`}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={(e) => handleTouchEnd(e, post.id)}
                                style={{ animationDelay: '0.5s' }}
                            >
                                {post.users?.role === 'dancer' ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (expandedPost === post.id) router.push(`/chat?tab=requests&shop=${post.id}`);
                                            else setExpandedPost(post.id);
                                        }}
                                        className={`relative z-20 flex flex-col items-center justify-center transition-all duration-500 ease-out overflow-hidden shadow-2xl ${expandedPost === post.id
                                            ? 'w-48 bg-gradient-to-r from-pink-600 via-rose-500 to-pink-600 bg-[length:200%_200%] animate-[gradient-shift_3s_ease_infinite] rounded-2xl px-2 h-16 border-2 border-pink-900/60'
                                            : 'w-14 h-14 bg-black/40 backdrop-blur-xl border-2 border-pink-500 rounded-full hover:bg-pink-500/10'
                                            }`}
                                    >
                                        {expandedPost === post.id ? (
                                            <div className="flex flex-col items-center leading-none animate-in fade-in slide-in-from-right-4 duration-500">
                                                <span className="text-white font-black text-sm tracking-tighter uppercase">DANCE</span>
                                                <span className="text-white/80 font-black text-[10px] tracking-[0.2em] uppercase -mt-0.5">TODAY</span>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-[10px] font-black tracking-tighter text-pink-500 leading-none mb-0.5">RSV</span>
                                                <div className="w-4 h-0.5 bg-pink-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(236,72,153,1)]" />
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const isFollowing = followingIds.includes(post.user_id);
                                            if (!isFollowing) {
                                                alert("Follow this user to start a message.");
                                                return;
                                            }
                                            router.push(`/chat?recipient=${post.user_id}`);
                                        }}
                                        className="w-14 h-14 bg-blue-600/20 backdrop-blur-xl border-2 border-blue-500/30 rounded-full flex flex-col items-center justify-center hover:bg-blue-600/40 transition-all active:scale-90 shadow-2xl"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-400 mb-0.5">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                        <span className="text-[8px] font-black tracking-tighter text-blue-400 leading-none">CHAT</span>
                                    </button>
                                )}
                            </div>

                            {/* Volume Control */}
                            <div className={`${activePostId === post.id ? 'animate-icon-entry' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }}>
                                <VolumeDial 
                                    volume={volume} 
                                    isMuted={isMuted} 
                                    onVolumeChange={setVolume} 
                                    onMuteToggle={() => setIsMuted(!isMuted)} 
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Comment Modal (Bottom Sheet) */}
            {isCommentModalOpen && currentPost && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCommentModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-zinc-900 border-t border-white/10 rounded-t-[32px] h-[75vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                        <div className="flex justify-between items-center p-6 border-b border-white/5">
                            <h3 className="text-sm font-black tracking-widest uppercase">Comments ({comments.length})</h3>
                            <button onClick={() => setIsCommentModalOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {comments.length === 0 ? (
                                <div className="text-center py-10 opacity-30">
                                    <svg width="48" height="48" className="mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
                                    <p className="text-xs font-bold tracking-widest uppercase">No comments yet</p>
                                </div>
                            ) : (
                                comments.map(comment => (
                                    <div key={comment.id} className="flex gap-3">
                                        <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden flex-shrink-0 bg-zinc-800">
                                            {comment.users?.avatar_url ? (
                                                <img src={comment.users.avatar_url} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-600 bg-zinc-800">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                        <circle cx="12" cy="7" r="4" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1">{comment.users?.nickname || 'Guest User'}</p>
                                            <p className="text-sm text-zinc-200 font-medium leading-relaxed">{comment.content}</p>
                                            <p className="text-[9px] text-zinc-600 mt-2 font-bold uppercase tracking-widest">
                                                {new Date(comment.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-6 bg-zinc-900 border-t border-white/5 pb-10">
                            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 pl-4">
                                <input 
                                    className="flex-1 bg-transparent text-sm font-semibold outline-none py-2 placeholder-zinc-600"
                                    placeholder="Add a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSubmitComment()}
                                />
                                <button 
                                    onClick={handleSubmitComment}
                                    disabled={!newComment.trim() || isSubmittingComment}
                                    className="bg-pink-600 hover:bg-pink-500 disabled:opacity-30 disabled:scale-100 text-white font-black px-4 py-2 rounded-xl text-xs tracking-widest uppercase transition-all active:scale-95"
                                >
                                    {isSubmittingComment ? '...' : 'Post'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {isShareModalOpen && currentPost && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsShareModalOpen(false)} />
                    <div className="relative w-full max-w-xs bg-zinc-900 border border-white/10 rounded-[32px] p-8 animate-in zoom-in duration-300">
                        <h3 className="text-lg font-black tracking-widest uppercase mb-6 text-center">Share Tonight</h3>
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <button className="flex flex-col items-center gap-2 group active:scale-95 transition-all">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-pink-600/20 group-hover:border-pink-600/50">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-pink-500"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1V12h3l-.5 3H13v6.8c4.56-.93 8-4.96 8-9.8z"/></svg>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Facebook</span>
                            </button>
                            <button className="flex flex-col items-center gap-2 group active:scale-95 transition-all">
                                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-pink-600/20 group-hover:border-pink-600/50">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-white font-black"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">X / Twitter</span>
                            </button>
                        </div>
                        <button 
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.origin + '/home?postId=' + currentPost.id);
                                alert('Link copied to clipboard!');
                            }}
                            className="w-full py-4 bg-white text-black rounded-2xl font-black text-xs tracking-[0.2em] uppercase active:scale-95 transition-all"
                        >
                            Copy Direct Link
                        </button>
                        <button onClick={() => setIsShareModalOpen(false)} className="w-full mt-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Close</button>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
}

export default function HomeFeed() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <HomeFeedContent />
        </Suspense>
    );
}

