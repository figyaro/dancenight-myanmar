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
    image_url: string;
}

export default function Shops() {
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState<string | null>('英語');

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

                // Fetch shops
                const { data, error } = await supabase
                    .from('shops')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setShops(data || []);
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
            <main className="pt-20 pb-24 px-4 max-w-md mx-auto">
                <h1 className="text-2xl font-bold mb-6">{t('shops', language)}</h1>

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
                        {shops.map((shop) => (
                            <Link href={`/shops/${shop.id}`} key={shop.id} className="block transition-transform active:scale-[0.98]">
                                <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-colors">
                                    {shop.image_url ? (
                                        <img src={shop.image_url} alt={shop.name} className="w-full h-48 object-cover" />
                                    ) : (
                                        <div className="w-full h-48 bg-zinc-800 flex items-center justify-center text-zinc-600">
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                                <polyline points="9 22 9 12 15 12 15 22" />
                                            </svg>
                                        </div>
                                    )}
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h2 className="text-xl font-bold">{shop.name}</h2>
                                        </div>
                                        <p className="text-zinc-400 text-sm mb-3 line-clamp-2">{shop.description}</p>
                                        <div className="flex items-center text-zinc-500 text-xs">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                                <circle cx="12" cy="10" r="3" />
                                            </svg>
                                            {shop.location}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
            <BottomNav />
        </div>
    );
}

