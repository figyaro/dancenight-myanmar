'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getEffectiveUserId } from '../../lib/auth-util';
import { t } from '../../lib/i18n';

export default function BottomNav() {
    const pathname = usePathname();
    const [language, setLanguage] = useState<string | null>('英語');

    useEffect(() => {
        const fetchLanguage = async () => {
            const userId = await getEffectiveUserId();
            if (userId) {
                const { data } = await supabase
                    .from('users')
                    .select('language')
                    .eq('id', userId)
                    .single();
                if (data?.language) {
                    setLanguage(data.language);
                }
            }
        };
        fetchLanguage();
    }, []);

    const navItems = [
        { href: '/home', label: t('dancer_nav', language), icon: 'home' },
        { href: '/discover', label: t('discover', language), icon: 'search' },
        { href: '/post', label: '', icon: 'plus', isCenter: true },
        { href: '/chat', label: t('chat', language), icon: 'chat' },
        { href: '/profile', label: t('profile', language), icon: 'user' },
    ];

    const isActive = (href: string) => {
        if (href === '/home') return pathname === '/home' || pathname === '/shops' || pathname === '/events';
        return pathname === href;
    };

    const renderIcon = (icon: string, active: boolean, isCenter?: boolean) => {
        if (isCenter) {
            return (
                <div className="w-14 h-14 bg-gradient-to-tr from-pink-500 to-purple-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.5)] transform -translate-y-4 border-4 border-black/95 transition-transform hover:scale-105 active:scale-95">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                </div>
            );
        }

        const color = active ? '#ec4899' : '#9ca3af';
        switch (icon) {
            case 'home':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                );
            case 'search':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                );
            case 'chat':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                );
            case 'user':
                return (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                );
        }
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur border-t border-zinc-800 z-50">
            <div className="max-w-md mx-auto flex items-center justify-around h-[60px]">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center relative w-16 h-full ${active ? 'text-pink-500' : 'text-gray-400'
                                }`}
                        >
                            {renderIcon(item.icon, active, item.isCenter)}
                            {!item.isCenter && (
                                <span className="text-[10px] mt-1">{item.label}</span>
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
