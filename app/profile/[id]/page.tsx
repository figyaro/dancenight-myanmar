'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BottomNav from '../../components/BottomNav';
import TopNav from '../../components/TopNav';
import { supabase } from '../../../lib/supabase';
import { t } from '../../../lib/i18n';

export default function PublicProfile() {
    const { id } = useParams();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [viewerLanguage, setViewerLanguage] = useState<string | null>('英語');
    const router = useRouter();

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!id) return;
            try {
                // Get viewer's language for UI labels
                const { data: { user: viewer } } = await supabase.auth.getUser();
                if (viewer) {
                    const { data: viewerData } = await supabase
                        .from('users')
                        .select('language')
                        .eq('id', viewer.id)
                        .single();
                    if (viewerData?.language) {
                        setViewerLanguage(viewerData.language);
                    }
                }

                // Fetch target user's profile
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (data) setProfile(data);
            } catch (err) {
                console.error('Error fetching public profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [id]);

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

    if (!profile) {
        return (
            <div className="bg-black min-h-screen text-white flex flex-col items-center justify-center p-4">
                <p className="text-zinc-500 mb-4">User not found</p>
                <button
                    onClick={() => router.back()}
                    className="px-6 py-2 bg-zinc-800 rounded-lg text-sm font-bold"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="bg-black min-h-screen text-white">
            <TopNav />
            <main className="pt-20 pb-24 px-4 max-w-md mx-auto">
                <button
                    onClick={() => router.back()}
                    className="mb-6 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                    <span className="text-sm">Back</span>
                </button>

                <div className="flex flex-col items-center mb-8 text-center">
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
                        </div>
                        {profile?.mind_icon && (
                            <div className="absolute -bottom-1 -right-1 bg-zinc-800 p-2 rounded-full border border-zinc-700 text-xl shadow-lg leading-none">
                                {profile.mind_icon}
                            </div>
                        )}
                    </div>

                    <h2 className="text-3xl font-black mb-1">{profile?.nickname || 'Dancer'}</h2>
                    {profile?.short_bio && (
                        <p className="text-pink-400 font-bold tracking-tight text-lg mb-4">{profile.short_bio}</p>
                    )}

                    <div className="flex gap-3 w-full max-w-[280px]">
                        <button className="flex-1 bg-pink-600 hover:bg-pink-500 text-white py-3 rounded-xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-pink-900/20">
                            FOLLOW
                        </button>
                        <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-black text-sm transition-all active:scale-95 border border-white/5">
                            MESSAGE
                        </button>
                    </div>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/5">
                    <h3 className="text-xs font-black text-zinc-500 tracking-[0.2em] uppercase mb-4">{t('bio', viewerLanguage)}</h3>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm mb-6">
                        {profile?.gender && (
                            <div className="flex flex-col gap-1">
                                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{t('gender', viewerLanguage)}</span>
                                <span className="font-semibold">{profile.gender}</span>
                            </div>
                        )}
                        {profile?.nationality && (
                            <div className="flex flex-col gap-1">
                                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{t('nationality', viewerLanguage)}</span>
                                <span className="font-semibold">{profile.nationality}</span>
                            </div>
                        )}
                    </div>
                    {profile?.bio && (
                        <div className="pt-4 border-t border-white/5">
                            <p className="text-sm text-zinc-300 leading-relaxed italic">"{profile.bio}"</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                    <div className="flex-shrink-0 bg-zinc-900 px-4 py-3 rounded-xl border border-white/5 text-center min-w-[100px]">
                        <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Posts</p>
                        <p className="text-xl font-black">24</p>
                    </div>
                    <div className="flex-shrink-0 bg-zinc-900 px-4 py-3 rounded-xl border border-white/5 text-center min-w-[100px]">
                        <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Followers</p>
                        <p className="text-xl font-black">1.2K</p>
                    </div>
                    <div className="flex-shrink-0 bg-zinc-900 px-4 py-3 rounded-xl border border-white/5 text-center min-w-[100px]">
                        <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Likes</p>
                        <p className="text-xl font-black">8.4K</p>
                    </div>
                </div>
            </main>
            <BottomNav />
        </div>
    );
}
