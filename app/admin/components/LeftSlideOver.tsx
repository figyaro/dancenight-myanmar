'use client';

import { useEffect, useState } from 'react';

interface LeftSlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function LeftSlideOver({
    isOpen,
    onClose,
    title,
    children
}: LeftSlideOverProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMounted(true);
        } else {
            const timer = setTimeout(() => setMounted(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!mounted && !isOpen) return null;

    return (
        <div className={`fixed inset-0 z-[60] overflow-hidden transition-all duration-500 ${isOpen ? 'visible' : 'invisible delay-500'}`}>
            {/* Backdrop - Only darkening slightly as the main SlideOver already has one */}
            <div 
                className={`absolute inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Slide Panel (Left) */}
            <div className={`absolute inset-y-0 left-0 w-full max-w-xl bg-black shadow-2xl transition-transform duration-500 ease-out border-r border-white/5 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/5 p-8">
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-white">{title}</h2>
                            <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mt-1">Media Preview</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-sm"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-zinc-950">
                        {children}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-white/5 p-6 bg-black/40 backdrop-blur-xl">
                        <button
                            onClick={onClose}
                            className="w-full px-6 py-4 rounded-2xl bg-white/5 text-zinc-400 text-[10px] font-black tracking-widest uppercase hover:bg-white/10 transition-all"
                        >
                            Close Preview
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
