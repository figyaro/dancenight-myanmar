'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import LoadingScreen from '../components/LoadingScreen';

const Icons = {
    Dashboard: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
    ),
    Users: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
    Dancers: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    ),
    Reservations: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ),
    Posts: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    ),
    Shops: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M17 21v-2a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"/><path d="M17 3H7"/><path d="M17 7H7"/></svg>
    ),
    Events: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>
    ),
    Plans: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
    ),
    Translations: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>
    ),
    Settings: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
    ),
    Home: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    ),
    Sales: () => (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 8-8 8"/><path d="m12 16 4-4-4-4"/></svg>
    )
};

const ALL_MENU_ITEMS = [
    { name: 'Dashboard', icon: Icons.Dashboard, path: '/admin' },
    { name: 'Users', icon: Icons.Users, path: '/admin/users' },
    { name: 'Dancers', icon: Icons.Dancers, path: '/admin/dancers' },
    { name: 'Reservations', icon: Icons.Reservations, path: '/admin/reservations' },
    { name: 'Posts', icon: Icons.Posts, path: '/admin/posts' },
    { name: 'Shops', icon: Icons.Shops, path: '/admin/shops' },
    { name: 'Sales', icon: Icons.Sales, path: '/admin/sales' },
    { name: 'Events', icon: Icons.Events, path: '/admin/events' },
    { name: 'Plans', icon: Icons.Plans, path: '/admin/plans' },
    { name: 'Translations', icon: Icons.Translations, path: '/admin/translations' },
    { name: 'Settings', icon: Icons.Settings, path: '/admin/settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userRole, setUserRole] = useState<string>('');
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        let isMounted = true;
        
        const checkAdmin = async () => {
            try {
                // Wait for Supabase to initialize/load session
                let session = null;
                let user = null;

                for (let i = 0; i < 5; i++) {
                    const { data: sData } = await supabase.auth.getSession();
                    if (sData.session) {
                        session = sData.session;
                        user = session.user;
                        break;
                    }

                    // Fallback to getUser which is more authoritative but slower
                    const { data: uData } = await supabase.auth.getUser();
                    if (uData.user) {
                        user = uData.user;
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

                if (!isMounted) return;

                if (!user) {
                    console.error('Admin Layout: No session/user found after multiple retries');
                    router.replace('/home');
                    return;
                }

                const { data: profile, error } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Admin Layout: Profile fetch error:', error);
                    router.replace('/home');
                    return;
                }

                if (!profile) {
                    console.error('Admin Layout: No profile found for user');
                    router.replace('/home');
                    return;
                }

                const role = profile.role?.toString().trim().toLowerCase();
                setUserRole(role || '');
                const isAuthorized = role === 'admin' || role === 'super admin' || role === 'admin sales';

                if (!isAuthorized) {
                    console.warn(`Admin Layout: Access Denied. User role: "${profile.role}"`);
                    router.replace('/home');
                    return;
                }

                setAuthorized(true);
            } catch (err: any) {
                console.error('Admin Layout: Unexpected Auth Check Error:', err);
                if (isMounted) {
                    router.replace('/home');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        checkAdmin();
        return () => { isMounted = false; };
    }, [router]);

    // Filter menu items based on role
    const MENU_ITEMS = ALL_MENU_ITEMS.filter(item => {
        if (userRole === 'admin sales') {
            return ['Dashboard', 'Shops', 'Sales'].includes(item.name);
        }
        return true;
    });

    // Close sidebar on path change (mobile)
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    if (loading) return <LoadingScreen />;
    if (!authorized) return null;

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-zinc-100 overflow-hidden relative">
            {/* Sidebar Overlay (Mobile) */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-50 w-72 bg-zinc-900/80 border-r border-white/5 flex flex-col backdrop-blur-2xl transition-transform duration-500 ease-out
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logoDN.svg" alt="DN" className="h-8 w-auto" />
                        <span className="font-black tracking-tighter text-xl">CONSOLE</span>
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
                    {MENU_ITEMS.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                                    isActive 
                                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20' 
                                    : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100 group-hover:scale-110'}`}>
                                    <item.icon />
                                </span>
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5 space-y-2">
                    <button 
                        onClick={() => router.push('/home')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:text-white hover:bg-white/5 transition-all group"
                    >
                        <span className="transition-transform group-hover:translate-x-1">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        </span>
                        Exit Console
                    </button>

                    <button 
                        onClick={async () => {
                            await supabase.auth.signOut();
                            router.replace('/home');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:text-red-400 hover:bg-red-400/5 transition-all group"
                    >
                        <span className="transition-transform group-hover:translate-x-1">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                        </span>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-20 border-b border-white/5 bg-zinc-900/20 backdrop-blur-md flex items-center justify-between px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        {/* Mobile Menu Toggle */}
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center lg:hidden"
                        >
                            <span className="text-xl">{isSidebarOpen ? '✕' : '☰'}</span>
                        </button>
                        
                        <h2 className="font-black text-[10px] sm:text-xs uppercase tracking-[0.3em] text-zinc-500">
                            {MENU_ITEMS.find(i => i.path === pathname)?.name || 'Admin'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">Admin Session</p>
                            <p className="text-xs font-bold text-pink-500">Authorized</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
                    {children}
                </div>
            </main>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
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
