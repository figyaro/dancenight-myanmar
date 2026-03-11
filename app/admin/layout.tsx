'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import LoadingScreen from '../components/LoadingScreen';

const MENU_ITEMS = [
    { name: 'Dashboard', icon: '📊', path: '/admin' },
    { name: 'Users', icon: '👤', path: '/admin/users' },
    { name: 'Dancers', icon: '💃', path: '/admin/dancers' },
    { name: 'Reservations', icon: '📅', path: '/admin/reservations' },
    { name: 'Posts', icon: '📝', path: '/admin/posts' },
    { name: 'Shops', icon: '🏢', path: '/admin/shops' },
    { name: 'Events', icon: '🎉', path: '/admin/events' },
    { name: 'Plans', icon: '💳', path: '/admin/plans' },
    { name: 'Translations', icon: '🌐', path: '/admin/translations' },
    { name: 'Settings', icon: '⚙️', path: '/admin/settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.replace('/home');
                    return;
                }

                const { data: profile, error } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (error || profile?.role !== 'admin') {
                    console.error('Admin Access Denied:', error || 'User is not an admin');
                    router.replace('/home');
                    return;
                }

                setAuthorized(true);
            } catch (err) {
                console.error('Auth Check Error:', err);
                router.replace('/home');
            } finally {
                setLoading(false);
            }
        };

        checkAdmin();
    }, [router]);

    if (loading) return <LoadingScreen />;
    if (!authorized) return null;

    return (
        <div className="flex h-screen bg-[#0a0a0a] text-zinc-100 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-zinc-900/50 border-r border-white/5 flex flex-col">
                <div className="p-6 border-b border-white/5 flex items-center gap-3">
                    <img src="/logoDN.svg" alt="DN" className="h-8 w-auto" />
                    <span className="font-black tracking-tighter text-xl">CONSOLE</span>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
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
                                <span className="text-lg">{item.icon}</span>
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button 
                        onClick={() => router.push('/home')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                    >
                        <span>🏠</span>
                        Exit Console
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-white/5 bg-zinc-900/20 backdrop-blur-md flex items-center justify-between px-8">
                    <h2 className="font-black text-sm uppercase tracking-widest text-zinc-500">
                        {MENU_ITEMS.find(i => i.path === pathname)?.name || 'Admin'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">Admin Session</p>
                            <p className="text-xs font-bold text-pink-500">Authorized</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
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
