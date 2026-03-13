'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { getEffectiveUserId } from '../../lib/auth-util';
import BottomNav from '../components/BottomNav';

export default function PostPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // User state
    const [userId, setUserId] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Form state
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [caption, setCaption] = useState('');
    const [content, setContent] = useState('');
    const [area, setArea] = useState('');
    const [price, setPrice] = useState('');
    const [currency, setCurrency] = useState('MMK');
    const [locationName, setLocationName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const areas = ['Yankin', 'Sanchaung', 'Bahan', 'Mayangone', 'Kamayut', 'Hlaing', 'Tamwe', 'Downtown'];

    useEffect(() => {
        const fetchUserData = async () => {
            if (!isSupabaseConfigured) {
                setError('Supabaseの環境設定が見つかりません。');
                setLoading(false);
                return;
            }

            try {
                const effectiveUserId = await getEffectiveUserId();
                if (!effectiveUserId) {
                    router.push('/login');
                    return;
                }
                setUserId(effectiveUserId);

                const { data: profileData, error: profileError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', effectiveUserId)
                    .single();

                if (profileError) throw profileError;
                setProfile(profileData);
            } catch (err: any) {
                console.error('Error fetching user data:', err);
                setError('ユーザー情報の取得に失敗しました。');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setMediaPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mediaFile || !caption.trim() || isSubmitting) return;

        setIsSubmitting(true);
        setError(null);

        try {
            // 1. Upload media to Storage
            const fileExt = mediaFile.name.split('.').pop();
            const fileName = `${userId}-${Date.now()}.${fileExt}`;
            const filePath = `posts/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('posts')
                .upload(fileName, mediaFile);

            if (uploadError) throw new Error(`アップロード失敗: ${uploadError.message}`);

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('posts')
                .getPublicUrl(fileName);

            // 3. Insert into DB
            const postData: any = {
                user_id: userId,
                name: profile?.nickname || profile?.name || 'User',
                title: caption,
                main_image_url: publicUrl,
                area: area || 'Unknown',
                rating: 5.0, // Default rating for new posts
            };

            if (profile?.role === 'dancer') {
                postData.price_per_hour = parseInt(price) || 0;
                postData.currency = currency;
                postData.location_name = locationName || 'Private';
            } else {
                postData.location_name = 'Post';
                postData.price_per_hour = 0;
                postData.currency = 'MMK';
            }

            const { error: dbError } = await supabase
                .from('posts')
                .insert([postData]);

            if (dbError) throw dbError;

            router.push('/home');
        } catch (err: any) {
            console.error('Submission error:', err);
            setError(err.message || '投稿中にエラーが発生しました。');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-black min-h-screen text-white flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-pink-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="bg-black min-h-screen text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-b border-zinc-800">
                <div className="max-w-md mx-auto flex items-center justify-between px-4 py-4">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-400 hover:text-white"
                    >
                        キャンセル
                    </button>
                    <h1 className="text-lg font-bold">新規投稿 ({profile?.role === 'dancer' ? 'ダンサー' : '一般'})</h1>
                    <button
                        onClick={handleSubmit}
                        disabled={!content.trim() && !caption.trim() || isSubmitting || !mediaFile}
                        className="text-pink-500 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? '処理中...' : '投稿する'}
                    </button>
                </div>
            </header>

            <main className="pt-20 pb-24 px-4 max-w-md mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Media Upload */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full aspect-[4/5] bg-zinc-900 rounded-2xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden transition-all hover:bg-zinc-800/50 ${mediaPreview ? 'border-pink-500/50' : 'hover:border-zinc-700'}`}
                    >
                        {mediaPreview ? (
                            <img src={mediaPreview} className="w-full h-full object-cover" alt="Preview" />
                        ) : (
                            <>
                                <div className="w-12 h-12 bg-pink-500/10 rounded-full flex items-center justify-center text-pink-500 mb-3">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <polyline points="21 15 16 10 5 21" />
                                    </svg>
                                </div>
                                <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">画像/動画を選択</span>
                                <span className="text-[10px] text-zinc-600 mt-1 uppercase">4:5 ratio recommended</span>
                            </>
                        )}
                        <input
                            type="file"
                            hidden
                            ref={fileInputRef}
                            accept="image/*,video/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Caption */}
                    <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 px-1">キャプション</label>
                        <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="素晴らしい踊りを見せよう..."
                            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 text-white placeholder-zinc-700 focus:outline-none focus:border-pink-500 min-h-[100px] resize-none transition-colors"
                        />
                    </div>

                    {/* Role Dependent Fields */}
                    {profile?.role === 'dancer' ? (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 px-1">エリア</label>
                                <select
                                    value={area}
                                    onChange={(e) => setArea(e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 appearance-none transition-colors"
                                >
                                    <option value="">エリアを選択</option>
                                    {areas.map(a => (
                                        <option key={a} value={a}>{a}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 px-1">料金</label>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="50,000"
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-pink-500 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 px-1">通貨</label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 appearance-none transition-colors"
                                >
                                    <option value="MMK">MMK</option>
                                    <option value="USD">USD</option>
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 px-1">場所 (Shop等)</label>
                                <input
                                    type="text"
                                    value={locationName}
                                    onChange={(e) => setLocationName(e.target.value)}
                                    placeholder="Blue Sky Dance Club"
                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-700 focus:outline-none focus:border-pink-500 transition-colors"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 px-1">エリア (任意)</label>
                            <select
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-pink-500 appearance-none transition-colors"
                            >
                                <option value="">選択しない</option>
                                {areas.map(a => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </form>
            </main>

            <BottomNav />
        </div>
    );
}
