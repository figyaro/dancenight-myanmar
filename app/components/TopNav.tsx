'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getEffectiveUserId } from '../../lib/auth-util';
import { t } from '../../lib/i18n';

export default function TopNav() {
    const pathname = usePathname();
    const [language, setLanguage] = useState<string | null>('英語');
    const [isVisible, setIsVisible] = useState(true);

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

    const tabs = [
        { href: '/home', label: t('dancer_nav', language) },
        { href: '/shops', label: t('shops', language) },
        { href: '/events', label: t('events', language) },
    ];

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-[100] bg-black/40 backdrop-blur-xl border-b border-white/5 transition-transform duration-500 ease-in-out ${isVisible ? 'translate-y-0' : '-translate-y-full'
                }`}
        >
            <div className="max-w-md mx-auto flex items-center justify-center h-16 px-6 relative">
                {/* Logo on the left - Toggle Button */}
                <div className="absolute left-6 top-0 h-full flex items-center">
                    <button
                        onClick={() => setIsVisible(!isVisible)}
                        className="transition-transform active:scale-95 z-[110]"
                        style={{
                            transform: !isVisible ? 'translateY(80px)' : 'none',
                            transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                    >
                        <img
                            src="/logoDN.svg"
                            alt="DanceNight"
                            className={`h-12 w-auto object-contain drop-shadow-lg transition-transform duration-700 ${isVisible ? 'rotate-0' : 'rotate-[360deg]'
                                }`}
                        />
                    </button>
                </div>

                <div className="flex items-center gap-8 relative">
                    {tabs.map((tab) => {
                        const active = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`text-sm tracking-[0.1em] font-semibold transition-all duration-300 relative py-2 ${active ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                {tab.label}
                                {active && (
                                    <span className="absolute -bottom-[1px] left-0 right-0 h-[2px] bg-gradient-to-r from-pink-500 to-rose-400 rounded-full" />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Minimalist divider/accent */}
                <div className="absolute top-0 right-4 h-full flex items-center">
                    <div className="w-[1px] h-4 bg-zinc-800" />
                </div>
            </div>
        </header>
    );

}
