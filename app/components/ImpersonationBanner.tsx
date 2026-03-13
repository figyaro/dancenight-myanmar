'use client';

import { useState, useEffect } from 'react';
import { isImpersonating, stopImpersonating } from '../../lib/auth-util';
import { supabase } from '../../lib/supabase';

export default function ImpersonationBanner() {
    const [active, setActive] = useState(false);
    const [userName, setUserName] = useState<string | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            const impersonating = isImpersonating();
            setActive(impersonating);

            if (impersonating) {
                const id = sessionStorage.getItem('impersonatedId');
                const cachedName = sessionStorage.getItem('impersonatedName');
                
                if (cachedName) {
                    setUserName(cachedName);
                } else if (id) {
                    const { data } = await supabase
                        .from('users')
                        .select('nickname, name')
                        .eq('id', id)
                        .single();
                    const name = data?.nickname || data?.name || 'User';
                    setUserName(name);
                    sessionStorage.setItem('impersonatedName', name);
                }
            }
        };

        checkStatus();
        
        // Listen for storage changes in the same tab (though we handle it via reload usually)
        const interval = setInterval(checkStatus, 2000);
        return () => clearInterval(interval);
    }, []);

    if (!active) return null;

    return (
        <div className="fixed top-6 left-6 z-[9999] animate-in slide-in-from-left duration-500">
            <div className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-6 group">
                {/* Status Indicator */}
                <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900 animate-pulse" />
                </div>

                {/* Info Text */}
                <div className="min-w-[120px]">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 leading-none mb-1.5 opacity-80">Super Admin Mode</h2>
                    <p className="text-xs font-bold text-white leading-none flex items-center gap-1.5">
                        <span className="text-zinc-500 font-medium">As:</span>
                        <span className="truncate max-w-[100px]">{userName || 'Loading...'}</span>
                    </p>
                </div>

                {/* Exit Button */}
                <button 
                    onClick={stopImpersonating}
                    className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-red-500/20 hover:text-red-500 text-zinc-400 border border-white/5 transition-all flex items-center justify-center active:scale-90"
                    title="Exit Impersonation"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        </div>
    );
}
