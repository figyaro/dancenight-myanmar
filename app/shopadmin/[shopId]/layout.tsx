'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import { getEffectiveUserId } from '../../../lib/auth-util';
import LoadingScreen from '../../components/LoadingScreen';

const Icons = {
    Dashboard: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    ),
    Posts: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
    ),
    Users: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
    Reservations: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ),
    Events: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
    ),
    Staff: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19 9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
    ),
    Rooms: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/><path d="M3 9V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/></svg>
    ),
    Menu: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>
    ),
    Plans: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
    ),
    Reviews: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
    ),
    Tools: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    ),
    Admin: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    ),
    Settings: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
    ),
    Home: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    ),
    SNS: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
    ),
    Analytics: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 20-4-4-3 3-4-4-3 3"/><path d="M3 3v18h18"/><path d="m15 8 2-2 3 3"/></svg>
    ),
};

interface MenuItem {
    name: string;
    icon: () => React.ReactNode;
    path: string;
    tags: string[]; // List of categories that see this item
}

const ALL_MENU_ITEMS: MenuItem[] = [
    { name: 'Dashboard', icon: Icons.Dashboard, path: '', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Post Management', icon: Icons.Posts, path: '/posts', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'User Management', icon: Icons.Users, path: '/customers', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Reservation Management', icon: Icons.Reservations, path: '/reservations', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Event Management', icon: Icons.Events, path: '/events', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'DJ Management', icon: Icons.Staff, path: '/staff', tags: ['Club'] },
    { name: 'Room Management', icon: Icons.Rooms, path: '/rooms', tags: ['KTV'] },
    { name: 'Menu Management', icon: Icons.Menu, path: '/menu', tags: ['Restaurant'] },
    { name: 'Plan Management', icon: Icons.Plans, path: '/plans', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Reviews', icon: Icons.Reviews, path: '/reviews', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Attraction Tools', icon: Icons.Tools, path: '/tools', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Adm Settings', icon: Icons.Admin, path: '/admin-settings', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'SNS Integration', icon: Icons.SNS, path: '/sns', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Analytics', icon: Icons.Analytics, path: '/analytics', tags: ['Club', 'KTV', 'Restaurant'] },
    { name: 'Shop Settings', icon: Icons.Settings, path: '/settings', tags: ['Club', 'KTV', 'Restaurant'] },
];

export default function ShopAdminLayout({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [shop, setShop] = useState<any>(null);
    const [membershipRole, setMembershipRole] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<any[]>([]);
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const shopId = params.shopId as string;

    useEffect(() => {
        const checkAccess = async () => {
            try {
                // Use getSession for stability
                const { data: { session } } = await supabase.auth.getSession();
                const authUser = session?.user;

                if (!authUser) {
                    router.replace('/home');
                    return;
                }

                const userId = await getEffectiveUserId();

                const { data: membership, error: memberError } = await supabase
                    .from('shop_members')
                    .select('role') // Default to role only to avoid 400 if permissions column is missing
                    .eq('shop_id', shopId)
                    .eq('user_id', userId)
                    .maybeSingle();

                // If role fetched successfully, try to fetch permissions separately
                let memberPermissions: any[] = [];
                if (membership) {
                    const { data: permData } = await supabase
                        .from('shop_members')
                        .select('permissions')
                        .eq('shop_id', shopId)
                        .eq('user_id', userId)
                        .maybeSingle();
                    memberPermissions = permData?.permissions || [];
                }

                // Also check if global admin
                const { data: profile } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', authUser.id)
                    .single();

                const role = profile?.role?.toLowerCase();
                const isGlobalAdmin = role === 'admin' || role === 'super admin';

                if (!membership && !isGlobalAdmin) {
                    console.error('Access Denied to Shop:', shopId, 'Role:', profile?.role);
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

                setMembershipRole(membership?.role || (isGlobalAdmin ? 'owner' : null));
                setPermissions(memberPermissions);
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

    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const fetchPendingCount = async () => {
            const { count, error } = await supabase
                .from('room_reservations')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending')
                .in('room_id', (
                    await supabase
                        .from('shop_rooms')
                        .select('id')
                        .eq('shop_id', shopId)
                ).data?.map(r => r.id) || []);
            
            if (!error && count !== null) {
                setPendingCount(count);
            }
        };

        if (authorized && shopId) {
            fetchPendingCount();

            // Real-time subscription for reservation changes
            const channel = supabase
                .channel('reservation-changes')
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'room_reservations' 
                }, () => fetchPendingCount())
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [authorized, shopId]);

    if (loading) return <LoadingScreen />;
    if (!authorized) return null;

    // Filter menu items by shop category AND Sub-Admin permissions
    const filteredMenu = ALL_MENU_ITEMS.filter(item => {
        const categoryMatch = item.tags.includes(shop?.category || 'Club');
        if (!categoryMatch) return false;

        // Sub-Admins are restricted to specific paths in their permissions array
        // Dashboard (path: '') and Adm Settings (per-role logic) might have special rules
        if (membershipRole === 'sub-admin') {
            // Basic paths check
            const hasPermission = permissions.includes(item.path);
            
            // Dashboard and Adm Settings are usually accessible or have specific keys
            if (item.path === '') return true; // Everyone sees dashboard
            
            return hasPermission;
        }

        return true; // Owners and Global Admins see everything in their category
    });

    return (
        <div className="flex h-screen bg-[#080808] text-zinc-100 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-72 bg-zinc-900 border-r border-white/5 flex flex-col">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-pink-900/20">
                            {shop?.category === 'Club' ? '🎧' : shop?.category === 'KTV' ? '🎤' : '🍽️'}
                        </div>
                        <div>
                            <h1 className="font-black text-sm tracking-widest uppercase truncate max-w-[120px]">
                                {shop?.name}
                            </h1>
                            <p className="text-[10px] font-black text-pink-500 tracking-[0.2em]">{shop?.category?.toUpperCase()} ADMIN</p>
                        </div>
                    </div>
                    <Link 
                        href="/home"
                        className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all border border-white/5 group"
                        title="Visit Site"
                    >
                        <Icons.Home />
                    </Link>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
                    {filteredMenu.map((item) => {
                        const fullPath = `/shopadmin/${shopId}${item.path}`;
                        const isActive = pathname === fullPath || (item.path === '' && pathname === `/shopadmin/${shopId}`);
                        const isReservation = item.name === 'Reservation Management';
                        
                        return (
                            <Link
                                key={item.name}
                                href={fullPath}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-xs font-black tracking-widest transition-all group ${
                                    isActive 
                                    ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-xl shadow-pink-900/20 scale-[1.02]' 
                                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100 group-hover:scale-110'}`}>
                                    <item.icon />
                                </span>
                                <span className="flex-1">{item.name.toUpperCase()}</span>
                                {isReservation && pendingCount > 0 && (
                                    <span className={`min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-black shadow-lg ${
                                        isActive ? 'bg-white text-pink-600' : 'bg-pink-600 text-white shadow-pink-900/40'
                                    }`}>
                                        {pendingCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5 bg-black/20">
                    <button 
                        onClick={() => router.push('/home')}
                        className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl text-[10px] font-black tracking-[0.3em] text-zinc-500 hover:text-white hover:bg-white/5 transition-all uppercase group"
                    >
                        <span className="transition-transform group-hover:translate-x-1">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        </span>
                        Back to Frontend
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
