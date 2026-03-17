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
            className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isVisible ? 'translate-y-0' : '-translate-y-full'
                }`}
        >
            {/* Liquid Glass Background with Gradient for Visibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent backdrop-blur-md border-b border-white/5" />

            <div className="max-w-md mx-auto flex items-center justify-center h-20 px-6 relative">
                {/* Logo on the left - Toggle Button */}
                <div className="absolute left-6 top-0 h-full flex items-center">
                    <button
                        onClick={() => setIsVisible(!isVisible)}
                        className="transition-transform active:scale-90 z-[110] relative group"
                        style={{
                            transform: !isVisible ? 'translateY(84px)' : 'none',
                            transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                    >
                        <div className="absolute inset-0 bg-pink-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <img
                            src="/logoDN.svg"
                            alt="Dance Together"
                            className={`h-10 w-auto object-contain drop-shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all duration-700 ${isVisible ? 'rotate-0 scale-100' : 'rotate-[360deg] scale-90'
                                }`}
                        />
                    </button>
                </div>

                <div className="flex items-center gap-1.5 p-1.5 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl relative">
                    {tabs.map((tab) => {
                        const active = pathname === tab.href;
                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                className={`text-[10px] tracking-[0.2em] font-black uppercase transition-all duration-500 relative px-4 py-2 rounded-xl h-9 flex items-center ${active 
                                    ? 'text-white bg-white/10 shadow-[inner_0_0_10px_rgba(255,255,255,0.1)]' 
                                    : 'text-white/40 hover:text-white/80'
                                    }`}
                            >
                                <span className="relative z-10">{tab.label}</span>
                                {active && (
                                    <div className="absolute bottom-1.5 left-4 right-4 h-0.5 bg-gradient-to-r from-pink-500 to-rose-400 rounded-full animate-in fade-in zoom-in duration-500" />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Right hidden divider for balance */}
                <div className="absolute right-6 top-0 h-full flex items-center opacity-0 pointer-events-none">
                    <div className="w-[1px] h-4 bg-zinc-800" />
                </div>
            </div>
        </header>
    );

}
