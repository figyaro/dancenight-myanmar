'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '../components/BottomNav';
import TopNav from '../components/TopNav';
import { supabase } from '../../lib/supabase';
import { t } from '../../lib/i18n';

export default function Profile() {
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }

                // キャッシュを回避するために明示的に最新データを取得
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;
                if (data) setProfile(data);
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
        <div className="bg-black min-h-screen text-white">
            <TopNav />
            <main className="pt-20 pb-24 px-4 max-w-md mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">{t('profile', profile?.language)}</h1>
                    <button onClick={handleLogout} className="text-zinc-500 text-sm hover:text-white transition-colors">
                        Logout
                    </button>
                </div>

                {/* プロフィール情報 */}
                <div className="flex flex-col items-center mb-6 text-center">
                    {/* アバター */}
                    <div className="relative mb-4">
                        <div className="w-24 h-24 rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-700">
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
                        </div>
                        {profile?.mind_icon && (
                            <div className="absolute -bottom-2 -right-2 bg-zinc-800 p-2 rounded-full border border-zinc-700 text-xl shadow-lg leading-none">
                                {profile.mind_icon}
                            </div>
                        )}
                    </div>

                    <h2 className="text-2xl font-bold">{profile?.nickname || profile?.name || 'Guest'}</h2>

                    {profile?.short_bio && (
                        <p className="text-pink-400 font-medium mt-1">{profile.short_bio}</p>
                    )}
                </div>

                {/* 基本情報 */}
                <div className="bg-zinc-900 rounded-xl p-4 mb-6">
                    <h3 className="text-sm font-bold text-zinc-400 border-b border-zinc-800 pb-2 mb-3">{t('bio', profile?.language)}</h3>
                    <div className="space-y-3 text-sm">
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

                {/* プロフィール編集ボタン */}
                <Link href="/profile/edit" className="flex items-center justify-center w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-lg font-medium mb-6 transition-colors">
                    {t('edit_profile', profile?.language)}
                </Link>

                {/* 確定済みの予約 */}
                <div className="bg-gradient-to-r from-pink-900/60 to-red-900/40 rounded-xl p-4 mb-4 border border-pink-800/30">
                    <p className="text-pink-400 text-sm mb-1">確定済みの予約</p>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold">今夜 21:00 - Pioneer KTV</h3>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden">
                                    <img
                                        src="https://picsum.photos/id/1015/50/50"
                                        alt="Dancer"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <span className="text-sm text-gray-300">Aung San K-POP さんと合流予定</span>
                            </div>
                        </div>
                        {/* QRコードアイコン */}
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                            <rect x="2" y="2" width="8" height="8" rx="1" />
                            <rect x="14" y="2" width="8" height="8" rx="1" />
                            <rect x="2" y="14" width="8" height="8" rx="1" />
                            <rect x="14" y="14" width="4" height="4" rx="0.5" />
                            <rect x="20" y="14" width="2" height="2" />
                            <rect x="14" y="20" width="2" height="2" />
                            <rect x="20" y="20" width="2" height="2" />
                        </svg>
                    </div>
                </div>

                {/* お気に入りのダンサー */}
                <button className="w-full flex items-center justify-between bg-zinc-900 rounded-xl p-4 mb-3 hover:bg-zinc-800 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        </div>
                        <span className="font-medium">お気に入りのダンサー</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                        <span className="text-sm">12人</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6" />
                        </svg>
                    </div>
                </button>

                {/* 過去の利用履歴 */}
                <button className="w-full flex items-center justify-between bg-zinc-900 rounded-xl p-4 mb-3 hover:bg-zinc-800 transition-colors">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="1 4 1 10 7 10" />
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                            </svg>
                        </div>
                        <span className="font-medium">過去の利用履歴</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </button>
            </main>
            <BottomNav />
        </div>
    );
}

