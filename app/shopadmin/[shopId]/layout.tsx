'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';

interface MenuItem {
    name: string;
    icon: string;
    path: string;
    tags: string[]; // List of categories that see this item
}

const ALL_MENU_ITEMS: MenuItem[] = [
    { name: 'Dashboard', icon: '📊', path: '', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Post Management', icon: '📝', path: '/posts', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'User Management', icon: '👤', path: '/users', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Reservation Management', icon: '📅', path: '/reservations', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Event Management', icon: '🎉', path: '/events', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'DJ Management', icon: '🎧', path: '/staff', tags: ['Club'] },
    { name: 'Room Management', icon: '🚪', path: '/rooms', tags: ['KTV'] },
    { name: 'Menu Management', icon: '🍽️', path: '/menu', tags: ['Restaurant'] },
    { name: 'Plan Management', icon: '💳', path: '/plans', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Reviews', icon: '⭐', path: '/reviews', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Attraction Tools', icon: '🚀', path: '/tools', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Adm Settings', icon: '🔐', path: '/admin-settings', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Shop Settings', icon: '⚙️', path: '/settings', tags: ['Club', 'KTV', 'Restaurant'] },
];

export default function ShopAdminLayout({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [shop, setShop] = useState<any>(null);
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const shopId = params.shopId as string;

    useEffect(() => {
        const checkAccess = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.replace('/home');
                    return;
                }

                // Check membership
                const { data: membership, error: memError } = await supabase
                    .from('shop_members')
                    .select('role')
                    .eq('shop_id', shopId)
                    .eq('user_id', user.id)
                    .single();

                // Also check if global admin
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (!membership && profile?.role !== 'admin') {
                    console.error('Access Denied to Shop:', shopId);
                    router.replace('/home');
                    return;
                }

                // Fetch shop category
                const { data: shopData, error: shopError } = await supabase
                    .from('shops')
                    .select('*')
                    .eq('id', shopId)
                    .single();

                if (shopError || !shopData) {
                    router.replace('/home');
                    return;
                }

                setShop(shopData);
                setAuthorized(true);
            } catch (err) {
                console.error('Shop Auth Error:', err);
                router.replace('/home');
            } finally {
                setLoading(false);
            }
        };

        if (shopId) checkAccess();
    }, [shopId, router]);

    if (loading) return <LoadingScreen />;
    if (!authorized) return null;

    // Filter menu items by shop category
    const filteredMenu = ALL_MENU_ITEMS.filter(item => 
        item.tags.includes(shop?.category || 'Club')
    );

    return (
        <div className="flex h-screen bg-[#080808] text-zinc-100 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-72 bg-zinc-900 border-r border-white/5 flex flex-col">
                <div className="p-8 border-b border-white/5">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-pink-900/20">
                            {shop?.category === 'Club' ? '🎧' : shop?.category === 'KTV' ? '🎤' : '🍽️'}
                        </div>
                        <div>
                            <h1 className="font-black text-sm tracking-widest uppercase truncate max-w-[140px]">
                                {shop?.name}
                            </h1>
                            <p className="text-[10px] font-black text-pink-500 tracking-[0.2em]">{shop?.category?.toUpperCase()} ADMIN</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
                    {filteredMenu.map((item) => {
                        const fullPath = `/shopadmin/${shopId}${item.path}`;
                        const isActive = pathname === fullPath || (item.path === '' && pathname === `/shopadmin/${shopId}`);
                        
                        return (
                            <Link
                                key={item.name}
                                href={fullPath}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-black tracking-widest transition-all ${
                                    isActive 
                                    ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-xl shadow-pink-900/20 scale-[1.02]' 
                                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <span className="text-xl opacity-80">{item.icon}</span>
                                {item.name.toUpperCase()}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5 bg-black/20">
                    <button 
                        onClick={() => router.push('/home')}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] text-zinc-500 hover:text-white hover:bg-white/5 transition-all uppercase"
                    >
                        <span>🏠</span> Back to Frontend
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-20 border-b border-white/5 bg-zinc-900/40 backdrop-blur-2xl flex items-center justify-between px-10">
                    <div>
                        <h2 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] mb-1">Current Module</h2>
                        <h3 className="font-black text-lg tracking-tight">
                            {filteredMenu.find(i => pathname.includes(i.path) && i.path !== '')?.name || 'Overview'}
                        </h3>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="h-10 w-px bg-white/5" />
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Store Status</p>
                                <p className="text-xs font-bold text-green-500 flex items-center gap-1.5 justify-end">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    ONLINE
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-gradient-to-b from-transparent to-black/30">
                    {children}
                </div>
            </main>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
}
