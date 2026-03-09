'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { t } from '../../../lib/i18n';
import TopNav from '../../components/TopNav';
import BottomNav from '../../components/BottomNav';

export default function ShopDetail() {
    const { id } = useParams();
    const router = useRouter();
    const [shop, setShop] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState<string | null>('英語');

    useEffect(() => {
        const fetchShopAndLanguage = async () => {
            try {
                // Fetch User Language
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('language')
                        .eq('id', user.id)
                        .single();
                    if (userData?.language) setLanguage(userData.language);
                }

                // Fetch Shop Details
                const { data, error } = await supabase
                    .from('shops')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setShop(data);
            } catch (err) {
                console.error('Error fetching shop detail:', err);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchShopAndLanguage();
    }, [id]);

    if (loading) {
        return (
            <div className="bg-black min-h-screen text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
            </div>
        );
    }

    if (!shop) {
        return (
            <div className="bg-black min-h-screen text-white flex flex-col items-center justify-center p-4 text-center">
                <h1 className="text-2xl font-bold mb-4">{t('no_shops', language)}</h1>
                <button
                    onClick={() => router.back()}
                    className="bg-zinc-800 px-6 py-2 rounded-full text-white"
                >
                    Back
                </button>
            </div>
        );
    }

    return (
        <div className="bg-black min-h-screen text-white relative">
            <TopNav />

            {/* Background Map (Simulated with Placeholder or Embed) */}
            <div className="fixed inset-0 z-0 opacity-40">
                {shop.map_url ? (
                    <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        src={shop.map_url}
                        allowFullScreen
                    ></iframe>
                ) : (
                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                        <span className="text-zinc-700">Map Background</span>
                    </div>
                )}
            </div>

            {/* Content Overlay */}
            <main className="relative z-10 pt-24 pb-32 px-4 max-w-md mx-auto min-h-screen flex flex-col justify-end">
                <div className="bg-black/60 backdrop-blur-md p-6 rounded-3xl border border-zinc-800 shadow-2xl space-y-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-1">{shop.name}</h1>
                        <p className="text-pink-500 font-medium flex items-center gap-1">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                            {shop.area}
                        </p>
                    </div>

                    <div className="space-y-4 text-sm">
                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-700/30">
                            <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-2">{t('address', language)}</h3>
                            <p className="text-zinc-200">{shop.location}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-700/30">
                                <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-1">{t('phone', language)}</h3>
                                <p className="text-zinc-200">{shop.phone || '-'}</p>
                            </div>
                            <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-700/30">
                                <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-1">{t('holiday', language)}</h3>
                                <p className="text-zinc-200">{shop.holiday || '-'}</p>
                            </div>
                        </div>

                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-700/30">
                            <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-1">{t('opening_hours', language)}</h3>
                            <p className="text-zinc-200 whitespace-pre-line">{shop.opening_hours || '-'}</p>
                        </div>

                        <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-700/30">
                            <h3 className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-1">{t('description', language)}</h3>
                            <p className="text-zinc-300 leading-relaxed">{shop.description}</p>
                        </div>
                    </div>

                    {/* Shop Posts (Thumbnails) */}
                    <div>
                        <h3 className="text-sm font-bold mb-3">{t('shop_posts', language)}</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="aspect-square bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
                                    <img
                                        src={`https://picsum.photos/seed/${shop.id}-${i}/200`}
                                        alt="Post"
                                        className="w-full h-full object-cover opacity-60"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="w-full bg-gradient-to-r from-pink-600 to-rose-500 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-pink-900/20 active:scale-[0.98] transition-all">
                        {t('reserve_now', language)}
                    </button>
                </div>
            </main>

            <BottomNav />
        </div>
    );
}
