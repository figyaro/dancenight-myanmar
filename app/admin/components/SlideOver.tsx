'use client';

import { useEffect, useState } from 'react';

interface SlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    onSave?: () => void;
    saveLabel?: string;
    isSaving?: boolean;
}

export default function SlideOver({
    isOpen,
    onClose,
    title,
    children,
    onSave,
    saveLabel = 'SAVE CHANGES',
    isSaving = false
}: SlideOverProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setMounted(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setMounted(false), 500);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!mounted && !isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 overflow-hidden transition-all duration-500 ${isOpen ? 'visible' : 'invisible delay-500'}`}>
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Slide Panel */}
            <div className={`absolute inset-y-0 right-0 w-full max-w-xl bg-zinc-900 shadow-2xl transition-transform duration-500 ease-out border-l border-white/5 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/5 p-8">
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-white">{title}</h2>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Management Context</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-sm"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="space-y-8">
                            {children}
                        </div>
                    </div>

                    {/* Footer */}
                    {onSave && (
                        <div className="border-t border-white/5 p-8 bg-black/20 backdrop-blur-xl">
                            <div className="flex gap-4">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-zinc-400 text-[10px] font-black tracking-widest uppercase hover:bg-white/10 transition-all"
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={onSave}
                                    disabled={isSaving}
                                    className="flex-[2] px-6 py-4 rounded-2xl bg-gradient-to-r from-pink-600 to-pink-500 text-white text-[10px] font-black tracking-widest uppercase shadow-xl shadow-pink-900/20 hover:scale-[1.02] transition-all disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            SAVING...
                                        </div>
                                    ) : saveLabel}
                                </button>
                            </div>
                        </div>
                    )}
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
