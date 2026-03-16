'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BottomNav from '../../components/BottomNav';
import TopNav from '../../components/TopNav';
import { supabase } from '../../../lib/supabase';
import { getEffectiveUserId } from '../../../lib/auth-util';
import { t } from '../../../lib/i18n';
import LoadingScreen from '../../components/LoadingScreen';
import { isBunnyStream, getBunnyStreamThumbnailUrl, isVideo, getBunnyStreamEmbedUrl } from '../../../lib/bunny';

export default function PublicProfile() {
    const { id } = useParams();
    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState({ posts: 0, followers: 0, following: 0, likes: 0 });
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [viewerLanguage, setViewerLanguage] = useState<string | null>('英語');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
    const [lastTap, setLastTap] = useState<{ id: string, time: number } | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!id) return;
            try {
                // Get viewer's ID (handles impersonation)
                const viewerId = await getEffectiveUserId();
                setCurrentUser(viewerId ? { id: viewerId } : null);

                if (viewerId) {
                    const { data: viewerData } = await supabase
                        .from('users')
                        .select('language')
                        .eq('id', viewerId)
                        .single();
                    if (viewerData?.language) {
                        setViewerLanguage(viewerData.language);
                    }

                    // Check if following
                    const { data: followData } = await supabase
                        .from('follows')
                        .select('follower_id, following_id')
                        .eq('follower_id', viewerId)
                        .eq('following_id', id)
                        .maybeSingle();
                    setIsFollowing(!!followData);
                }

                // Fetch target user's profile
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (data) setProfile(data);

                // Fetch Stats and Posts
                const [postsRes, followersRes, followingRes, likesRes] = await Promise.all([
                    supabase.from('posts').select('*').eq('user_id', id).order('created_at', { ascending: false }),
                    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', id),
                    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('follower_id', id),
                    supabase.from('likes').select('post_id', { count: 'exact', head: true }).in('post_id',
                        (await supabase.from('posts').select('id').eq('user_id', id)).data?.map(p => p.id) || []
                    )
                ]);

                setUserPosts(postsRes.data || []);
                setStats({
                    posts: postsRes.data?.length || 0,
                    followers: followersRes.count || 0,
                    following: followingRes.count || 0,
                    likes: likesRes.count || 0
                });

            } catch (err) {
                console.error('Error fetching public profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [id]);

    const handleFollow = async () => {
        if (!currentUser || !id || actionLoading) return;

        // Prevent self-following
        if (currentUser.id === id) {
            alert('自分自身をフォローすることはできません。');
            return;
        }

        // Basic UUID format check
        const isIdUuid = typeof id === 'string' && (id.length === 36 || id.length === 32);
        if (!isIdUuid) {
            console.error('DEBUG: Invalid ID format. Expected UUID, got:', id);
            alert(`エラー: 無効なID形式です (${id})。`);
            return;
        }

        setActionLoading(true);

        try {
            console.log('--- FOLLOW ACTION DIAGNOSTICS START ---');
            console.log('Follower (You):', currentUser.id);
            console.log('Following (Target):', id);

            // 1. Explicitly check if both users exist in public.users
            const { data: followerProfile, error: fError } = await supabase.from('users').select('id, nickname').eq('id', currentUser.id).maybeSingle();
            const { data: targetProfile, error: tError } = await supabase.from('users').select('id, nickname').eq('id', id).maybeSingle();

            if (fError) console.error('DEBUG: Follower Check Error:', fError);
            if (tError) console.error('DEBUG: Target Check Error:', tError);

            console.log('Follower profile in DB:', followerProfile);
            console.log('Target profile in DB:', targetProfile);

            if (!targetProfile) {
                console.error('DEBUG: Target user record missing');
                alert('フォロー対象のプロフィールが見つかりません。');
                setActionLoading(false);
                return;
            }

            // 2. If WE are missing, auto-create a basic profile to satisfy FK
            if (!followerProfile) {
                console.log('DEBUG: Auto-creating your profile...');
                const { error: createError } = await supabase.from('users').insert([{
                    id: currentUser.id,
                    nickname: currentUser.email?.split('@')[0] || 'Dancer',
                    language: '日本語',
                    created_at: new Date().toISOString()
                }]);

                if (createError) {
                    console.error('DEBUG: Profile creation failed:', createError);
                    alert(`プロフィール自動作成エラー: ${createError.message}`);
                    setActionLoading(false);
                    return;
                }
                console.log('DEBUG: Profile created successfully');
            }

            if (isFollowing) {
                // Unfollow
                console.log('DEBUG: Attempting unfollow (DELETE)...');
                const { error: unfollowError } = await supabase
                    .from('follows')
                    .delete()
                    .eq('follower_id', currentUser.id)
                    .eq('following_id', id);

                if (unfollowError) throw unfollowError;

                setIsFollowing(false);
                setStats(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
                console.log('DEBUG: Unfollow success');
            } else {
                // Follow
                console.log('DEBUG: Attempting follow (INSERT)...');
                const { error: followError } = await supabase
                    .from('follows')
                    .insert([{ follower_id: currentUser.id, following_id: id }]);

                if (followError) {
                    if (followError.code === '23505') {
                        console.warn('DEBUG: Already following (Conflict)');
                        setIsFollowing(true);
                    } else {
                        throw followError;
                    }
                } else {
                    setIsFollowing(true);
                    setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
                    console.log('DEBUG: Follow success');
                }
            }
            console.log('--- FOLLOW ACTION DIAGNOSTICS END ---');
        } catch (err: any) {
            console.error('Detailed Follow Error Object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
            const errorMsg = err.message || err.error_description || (typeof err === 'string' ? err : '不明なエラー');
            alert(`フォロー処理エラー: ${errorMsg}\n詳細をブラウザのコンソールで確認してください。`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleMessage = async () => {
        if (!currentUser || !id || actionLoading) return;
        setActionLoading(true);

        try {
            // 1. Check if a conversation already exists between these two participants
            const { data: convs, error: fetchError } = await supabase
                .from('conversations')
                .select('*')
                .contains('participants', [currentUser.id, id]);

            if (fetchError) throw fetchError;

            let conversationId;

            // Filter for exact two-way conversation if needed, or take the first match
            const existingConv = convs?.find(c => c.participants.length === 2);

            if (existingConv) {
                conversationId = existingConv.id;
            } else {
                // 2. Create new conversation
                const { data: newConv, error: createError } = await supabase
                    .from('conversations')
                    .insert([{
                        name: profile?.nickname || 'Chat',
                        participants: [currentUser.id, id],
                        updated_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (createError) throw createError;
                conversationId = newConv.id;
            }

            // 3. Navigate to chat
            router.push(`/chat/${conversationId}`);
        } catch (err: any) {
            console.error('Detailed Messaging Error Object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
            const errorMsg = err.message || err.error_description || (typeof err === 'string' ? err : '不明なエラー');
            console.error('Extracted Messaging Error:', errorMsg);
            alert(`メッセージ開始エラー: ${errorMsg}\n詳細をブラウザコンソールで確認してください。`);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePostTap = (post: any) => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;
        const isPostVideo = isBunnyStream(post.main_image_url) || isVideo(post.main_image_url);

        if (lastTap && lastTap.id === post.id && (now - lastTap.time) < DOUBLE_TAP_DELAY) {
            // Double Tap -> Navigate to Home
            router.push(`/home?postId=${post.id}&userId=${post.user_id}`);
            setLastTap(null);
        } else {
            // Single Tap -> Play in thumbnail (if video)
            setLastTap({ id: post.id, time: now });
            
            if (isPostVideo) {
                // Toggle playback
                setPlayingVideoId(prev => prev === post.id ? null : post.id);
            } else {
                // If image, maybe just navigate on single tap as before? 
                // Or wait for double tap? User said "動画の場合" (in case of video).
                // For images, we'll maintain single-tap navigation for better UX unless specified otherwise.
                router.push(`/home?postId=${post.id}&userId=${post.user_id}`);
            }
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }

    if (!profile) {
        return (
            <div className="bg-black min-h-[100dvh] text-white flex flex-col items-center justify-center p-4">
                <p className="text-zinc-500 mb-4 font-black tracking-widest uppercase">User not found</p>
                <button
                    onClick={() => router.back()}
                    className="px-6 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-sm font-black transition-all active:scale-95 shadow-lg border border-white/10"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="bg-black min-h-[100dvh] text-white relative">
            {/* Ambient Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-pink-500/20 blur-[120px] mix-blend-screen" />
                <div className="absolute top-[30%] right-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/20 blur-[100px] mix-blend-screen" />
                <div className="absolute bottom-[-20%] left-[20%] w-[70%] h-[70%] rounded-full bg-purple-500/20 blur-[120px] mix-blend-screen" />
            </div>

            <div className="relative z-10">
                <TopNav />
                <main className="pt-20 pb-24 px-4 max-w-md mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={() => router.back()}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>
                        <h1 className="text-sm font-black tracking-widest uppercase text-white/50">{profile?.nickname || 'Profile'}</h1>
                        <div className="w-10"></div> {/* flex-between用スペーサー */}
                    </div>

                    <div className="liquid-glass p-6 flex flex-col items-center mb-8 text-center transform transition-all duration-500 hover:scale-[1.01]">
                    <div className="relative mb-4">
                        <div className="w-28 h-28 rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700 shadow-xl">
                            {profile?.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.nickname}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-transparent pointer-events-none" />
                        </div>
                        {profile?.mind_icon && (
                            <div className="absolute -bottom-1 -right-1 bg-zinc-800 p-2 rounded-full border border-zinc-700 text-xl shadow-lg leading-none z-30">
                                {profile.mind_icon}
                            </div>
                        )}
                    </div>

                    <h2 className="text-2xl font-black tracking-tight drop-shadow-md mb-1">{profile?.nickname || 'Dancer'}</h2>
                    {profile?.short_bio && (
                        <p className="text-zinc-300 font-medium mt-2 leading-relaxed text-sm opacity-90 mix-blend-luminosity mb-4">{profile.short_bio}</p>
                    )}

                    <div className="flex gap-3 w-full max-w-[280px]">
                        <button
                            onClick={handleFollow}
                            disabled={actionLoading || currentUser?.id === id}
                            className={`flex-1 py-3 rounded-[1.25rem] font-black text-xs tracking-widest transition-all active:scale-95 shadow-lg relative overflow-hidden group ${isFollowing
                                ? 'bg-white/10 text-white/50 border border-white/5'
                                : 'bg-pink-600 text-white border border-pink-500/50 edge-glow-effect'
                                }`}
                        >
                            <span className="relative z-10">{actionLoading ? '...' : (isFollowing ? 'FOLLOWING' : 'FOLLOW')}</span>
                        </button>
                        <button
                            onClick={handleMessage}
                            disabled={actionLoading || currentUser?.id === id}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white py-3 rounded-[1.25rem] font-black text-xs tracking-widest transition-all active:scale-95 border border-white/10 flex items-center justify-center gap-2 edge-glow-effect group"
                        >
                            <svg className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                            </svg>
                            <span className="relative z-10">MESSAGE</span>
                        </button>
                    </div>
                </div>

                <div className="liquid-glass p-6 mb-6">
                    <h3 className="text-[10px] font-black text-white/50 tracking-[0.2em] uppercase border-b border-white/10 pb-3 mb-4">{t('bio', viewerLanguage)}</h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm mb-4 font-medium">
                        {profile?.gender && (
                            <div className="flex flex-col gap-1.5">
                                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{t('gender', viewerLanguage)}</span>
                                <span>{profile.gender}</span>
                            </div>
                        )}
                        {profile?.nationality && (
                            <div className="flex flex-col gap-1.5">
                                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">{t('nationality', viewerLanguage)}</span>
                                <span>{profile.nationality}</span>
                            </div>
                        )}
                    </div>
                    {profile?.bio && (
                        <div className="pt-4 mt-2 border-t border-white/10">
                            <p className="text-sm text-zinc-300 leading-relaxed italic opacity-90">"{profile.bio}"</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide no-scrollbar">
                    <div className="flex-shrink-0 bg-zinc-900 px-4 py-3 rounded-xl border border-white/5 text-center min-w-[90px]">
                        <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Posts</p>
                        <p className="text-xl font-black">{stats.posts}</p>
                    </div>
                    <div className="flex-shrink-0 bg-zinc-900 px-4 py-3 rounded-xl border border-white/5 text-center min-w-[90px]">
                        <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Followers</p>
                        <p className="text-xl font-black">{stats.followers > 999 ? (stats.followers / 1000).toFixed(1) + 'K' : stats.followers}</p>
                    </div>
                    <div className="flex-shrink-0 bg-zinc-900 px-4 py-3 rounded-xl border border-white/5 text-center min-w-[90px]">
                        <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Following</p>
                        <p className="text-xl font-black">{stats.following > 999 ? (stats.following / 1000).toFixed(1) + 'K' : stats.following}</p>
                    </div>
                    <div className="flex-shrink-0 bg-zinc-900 px-4 py-3 rounded-xl border border-white/5 text-center min-w-[90px]">
                        <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Likes</p>
                        <p className="text-xl font-black">{stats.likes > 999 ? (stats.likes / 1000).toFixed(1) + 'K' : stats.likes}</p>
                    </div>
                    {/* Spacer to prevent cutoff */}
                    <div className="flex-shrink-0 w-8" />
                </div>

                {/* Media Grid Section (User Posts) */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-6 px-1">
                        <h3 className="text-xs font-black tracking-[0.3em] text-zinc-500 uppercase">Creations</h3>
                        <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">{userPosts.length} POSTS</span>
                    </div>

                    {userPosts.length > 0 ? (
                        <div className="grid grid-cols-3 gap-1">
                            {userPosts.map((post) => {
                                const isPostVideo = isBunnyStream(post.main_image_url) || isVideo(post.main_image_url);
                                const isPlaying = playingVideoId === post.id;
                                
                                return (
                                    <div 
                                        key={post.id} 
                                        onClick={() => handlePostTap(post)}
                                        className="aspect-[9/16] liquid-glass !rounded-[1.25rem] !border-[0.5px] border-white/20 group cursor-pointer active:scale-95 transition-transform overflow-hidden relative"
                                    >
                                        <div className="edge-glow-effect absolute inset-0 z-20 pointer-events-auto rounded-[inherit]" /> {/* Click interceptor overlay with glow */}
                                        {post.main_image_url ? (
                                            isBunnyStream(post.main_image_url) ? (
                                                isPlaying ? (
                                                    <iframe
                                                        src={getBunnyStreamEmbedUrl(post.main_image_url, true) || ''}
                                                        loading="lazy"
                                                        style={{ border: 0, width: '100%', height: '100%' }}
                                                        className="w-full h-full object-cover pointer-events-none" 
                                                        allow="accelerometer; gyroscope; autoplay; encrypted-media;"
                                                    ></iframe>
                                                ) : (
                                                    <div className="w-full h-full relative">
                                                        <img 
                                                            src={getBunnyStreamThumbnailUrl(post.main_image_url) || ''} 
                                                            className="w-full h-full object-cover" 
                                                            alt="" 
                                                        />
                                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                                        </div>
                                                    </div>
                                                )
                                            ) : isVideo(post.main_image_url) ? (
                                                <div className="w-full h-full relative">
                                                    <video 
                                                        src={post.main_image_url} 
                                                        className="w-full h-full object-cover"
                                                        muted
                                                        playsInline
                                                        autoPlay={isPlaying}
                                                        onEnded={() => setPlayingVideoId(null)}
                                                    />
                                                    {!isPlaying && (
                                                        <div className="absolute top-2 right-2 w-5 h-5 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <img 
                                                    src={post.main_image_url} 
                                                    className="w-full h-full object-cover" 
                                                    alt="" 
                                                />
                                            )
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                                <span className="text-[8px] opacity-20 uppercase font-black">No Media</span>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        currentUser?.id === id ? (
                            <Link href="/post" className="liquid-glass py-12 text-center block hover:bg-white/5 transition-all group">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-xl opacity-20 group-hover:scale-110 transition-transform">🪩</div>
                                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">No posts yet</p>
                                <span className="text-pink-500 text-[9px] font-black uppercase tracking-[0.2em] mt-3 inline-block group-hover:text-pink-400 transition-colors">
                                    Share your first update
                                </span>
                            </Link>
                        ) : (
                            <div className="liquid-glass py-12 text-center">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-xl opacity-20">🪩</div>
                                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">No posts yet</p>
                            </div>
                        )
                    )}
                </div>
            </main>
            </div>
            <BottomNav />
        </div>
    );
}
