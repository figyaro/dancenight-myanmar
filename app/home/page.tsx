'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '../components/BottomNav';
import TopNav from '../components/TopNav';
import { supabase } from '../../lib/supabase';
import { t } from '../../lib/i18n';
import LoadingScreen from '../components/LoadingScreen';

interface UserProfile {
    nickname: string;
    avatar_url: string;
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
    const [activePostId, setActivePostId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [visibilityRatios, setVisibilityRatios] = useState<Record<string, number>>({});
    
    // Social Modal State
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [currentPost, setCurrentPost] = useState<Post | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

    const searchParams = useSearchParams();
    const postIdParam = searchParams.get('postId');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const postRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const touchStartX = useRef<number | null>(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch user and language
                const { data: { user: authUser } } = await supabase.auth.getUser();
                setUser(authUser);
                
                if (authUser) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('language')
                        .eq('id', authUser.id)
                        .single();
                    if (userData?.language) {
                        setLanguage(userData.language);
                    }
                }

                // Fetch posts with user profile join
                const { data, error } = await supabase
                    .from('posts')
                    .select('*, users(nickname, avatar_url)')
                    .order('id', { ascending: false });

                if (error) throw error;
                if (data) {
                    setPosts(data as Post[]);

                    // Fetch real-time likes
                    const { data: likesData } = await supabase.from('likes').select('post_id');
                    const counts: Record<string, number> = {};
                    likesData?.forEach(l => counts[l.post_id] = (counts[l.post_id] || 0) + 1);
                    setLikes(counts);

                    if (authUser) {
                        const { data: userLikesData } = await supabase.from('likes').select('post_id').eq('user_id', authUser.id);
                        if (userLikesData) setUserLikes(userLikesData.map(l => l.post_id));
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

                    if (data.length > 0) {
                        setTimeout(() => setActivePostId(data[0].id), 300);
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
            `}</style>

            <TopNav />

            {/* Main Feed */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="absolute inset-0 snap-y snap-mandatory overflow-y-scroll scrollbar-hide bg-black overscroll-none"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {loading && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                        <div className="animate-spin h-8 w-8 mb-4 border-4 border-pink-500 border-t-transparent rounded-full" />
                        <p className="text-xs font-bold tracking-widest uppercase">{t('loading_posts', language)}</p>
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
                                <span className="font-black tracking-tighter opacity-20 text-4xl">DANCE NIGHT</span>
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
                                <p className={`text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-300 text-2xl font-black ${activePostId === post.id ? 'animate-text-entry' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }}>{post.price_per_hour.toLocaleString()} <span className="text-xs font-bold uppercase">{post.currency}</span></p>
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
                                            <img
                                                src={post.users?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`}
                                                className="w-full h-full object-cover"
                                                alt="Profile"
                                            />
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

                            {/* RSV */}
                            <div
                                className={`relative flex items-center justify-end w-full min-h-[56px] ${activePostId === post.id ? 'animate-icon-entry' : 'opacity-0'}`}
                                onTouchStart={handleTouchStart}
                                onTouchEnd={(e) => handleTouchEnd(e, post.id)}
                                style={{ animationDelay: '0.5s' }}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (expandedPost === post.id) router.push(`/chat?tab=requests&shop=${post.id}`);
                                        else setExpandedPost(post.id);
                                    }}
                                    className={`relative z-20 flex flex-col items-center justify-center transition-all duration-500 ease-out overflow-hidden shadow-2xl ${expandedPost === post.id
                                        ? 'w-48 bg-gradient-to-r from-pink-600 to-rose-500 rounded-2xl px-2 h-14'
                                        : 'w-14 h-14 bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-full hover:bg-white/20'
                                        }`}
                                >
                                    {expandedPost === post.id ? (
                                        <span className="text-white font-black text-[10px] tracking-widest whitespace-nowrap animate-in fade-in slide-in-from-right-4 duration-500">
                                            RESERVE TONIGHT
                                        </span>
                                    ) : (
                                        <>
                                            <span className="text-[9px] font-black tracking-tighter text-white leading-none mb-0.5">RSV</span>
                                            <div className="w-4 h-0.5 bg-pink-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(236,72,153,1)]" />
                                        </>
                                    )}
                                </button>
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
                                            <img src={comment.users?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`} className="w-full h-full object-cover" />
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

