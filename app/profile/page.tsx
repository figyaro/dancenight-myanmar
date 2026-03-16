'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '../components/BottomNav';
import TopNav from '../components/TopNav';
import { getEffectiveUserId } from '../../lib/auth-util';
import { supabase } from '../../lib/supabase';
import { t } from '../../lib/i18n';
import { isBunnyStream, getBunnyStreamThumbnailUrl, isVideo, getBunnyStreamEmbedUrl } from '../../lib/bunny';

export default function Profile() {
    const [profile, setProfile] = useState<any>(null);
    const [dancerData, setDancerData] = useState<any>(null);
    const [userPosts, setUserPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const userId = await getEffectiveUserId();
                if (!userId) {
                    router.push('/login');
                    return;
                }

                // キャッシュを回避するために明示的に最新データを取得
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (error) throw error;
                if (data) {
                    setProfile(data);
                    
                    // Fetch user posts
                    const { data: postsData } = await supabase
                        .from('posts')
                        .select('*')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false });
                    setUserPosts(postsData || []);

                    // If dancer, fetch dancer-specific conditions
                    if (data.role === 'dancer') {
                        const { data: dData } = await supabase
                            .from('dancers')
                            .select('*')
                            .eq('user_id', userId)
                            .single();
                        if (dData) setDancerData(dData);
                    }
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="bg-black min-h-screen text-white flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-pink-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
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
                    <h1 className="text-2xl font-bold">{t('profile', profile?.language)}</h1>
                    <button onClick={handleLogout} className="text-zinc-500 text-sm hover:text-white transition-colors">
                        Logout
                    </button>
                </div>

                {/* プロフィール情報 - Liquid Glass Card */}
                <div className="liquid-glass p-6 flex flex-col items-center mb-6 text-center transform transition-all duration-500 hover:scale-[1.01]">
                    {/* アバター */}
                    <div className="relative mb-5 group cursor-pointer inline-block">
                        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl relative z-20">
                            {profile?.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-500">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/20 to-transparent pointer-events-none" />
                        </div>
                        
                        {/* Status Icon (Mind Icon) */}
                        {profile?.mind_icon && (
                            <div className="absolute -top-1 -left-1 bg-zinc-800 p-1.5 rounded-full border border-zinc-700 text-lg shadow-lg leading-none z-10">
                                {profile.mind_icon}
                            </div>
                        )}

                        <Link 
                            href="/profile/edit"
                            className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl hover:bg-white/10 transition-all z-30 edge-glow-effect"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                            </svg>
                        </Link>
                    </div>

                    <h2 className="text-2xl font-black tracking-tight drop-shadow-md">{profile?.nickname || profile?.name || 'Guest'}</h2>

                    {profile?.short_bio && (
                        <p className="text-zinc-300 font-medium mt-2 leading-relaxed text-sm opacity-90 mix-blend-luminosity">{profile.short_bio}</p>
                    )}
                </div>

                {/* 基本情報 */}
                <div className="liquid-glass p-5 mb-6">
                    <h3 className="text-[10px] font-black text-white/50 tracking-widest uppercase border-b border-white/10 pb-3 mb-4">{t('bio', profile?.language)}</h3>
                    <div className="space-y-4 text-sm font-medium">
                        {profile?.birth_date && (
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500">{t('birth_date', profile?.language)}</span>
                                <span>{new Date(profile.birth_date).toLocaleDateString()}</span>
                            </div>
                        )}
                        {profile?.gender && (
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500">{t('gender', profile?.language)}</span>
                                <span>{profile.gender}</span>
                            </div>
                        )}
                        {profile?.nationality && (
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500">{t('nationality', profile?.language)}</span>
                                <span>{profile.nationality}</span>
                            </div>
                        )}
                        {profile?.language && (
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500">{t('language_setting', profile?.language)}</span>
                                <span>{profile.language}</span>
                            </div>
                        )}
                    </div>
                    {profile?.bio && (
                        <div className="mt-4 pt-3 border-t border-zinc-800">
                            <span className="text-zinc-500 text-xs block mb-1">{t('bio', profile?.language)}</span>
                            <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>
                        </div>
                    )}
                </div>

                {/* Dance Condition Tab (Sticky Note/Bookmark Style) */}
                {profile?.role === 'dancer' && (
                    <Link 
                        href="/profile/conditions"
                        className="fixed right-0 top-[140px] z-[100] flex items-center bg-pink-600 hover:bg-pink-500 text-white p-3 rounded-l-2xl shadow-[0_10px_30px_rgba(219,39,119,0.3)] border-y border-l border-white/20 transition-all duration-300 group overflow-hidden"
                        style={{ width: 'fit-content' }}
                    >
                        {/* Text that slides in from the right when parent is hovered */}
                        <div className="max-w-0 group-hover:max-w-[120px] transition-all duration-500 ease-in-out overflow-hidden whitespace-nowrap">
                            <span className="text-[10px] font-black uppercase tracking-widest mr-3 block">Dance Setting</span>
                        </div>
                        
                        {/* Gear icon that is always visible */}
                        <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center group-hover:rotate-45 transition-transform flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        </div>
                    </Link>
                )}

                {/* ダンサー条件のサマリー表示 (Dancerのみ) */}
                {profile?.role === 'dancer' && dancerData && (
                    <div className="liquid-glass p-5 mb-6">
                        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
                            <h3 className="text-[10px] font-black tracking-widest text-white/50 uppercase">My Conditions</h3>
                            <span className="text-[10px] bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded font-bold border border-pink-500/30">Active</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-1.5">
                                {dancerData.condition_tags?.map((tag: string) => (
                                    <span key={tag} className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md border border-white/5">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                                <div>
                                    <p className="text-[10px] font-black text-white/40 uppercase mb-1">Price</p>
                                    <p className="font-bold text-pink-400">{dancerData.price_info || 'Not set'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-white/40 uppercase mb-1">Availability</p>
                                    <p className="font-bold">{dancerData.availability_info || 'Not set'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Media Grid Section (User Posts) */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-6 px-1">
                        <h3 className="text-xs font-black tracking-[0.3em] text-zinc-500 uppercase">My Creations</h3>
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
                                        onClick={() => {
                                            router.push(`/home?postId=${post.id}&userId=${post.user_id}`);
                                        }}
                                        className="aspect-[9/16] liquid-glass !rounded-xl !border-[0.5px] border-white/20 group cursor-pointer active:scale-95 transition-transform"
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
                        <div className="liquid-glass py-12 text-center">
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-xl opacity-20">📸</div>
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">No posts yet</p>
                            <Link href="/posts/new" className="text-pink-500 text-[9px] font-black uppercase tracking-[0.2em] mt-3 inline-block hover:text-pink-400 transition-colors">
                                Share your first update
                            </Link>
                        </div>
                    )}
                </div>
            </main>
            </div>
            <BottomNav />
        </div>
    );
}

