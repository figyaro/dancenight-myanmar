'use client';

import { useState } from 'react';
import LoadingScreen from '../../components/LoadingScreen';

const LANGUAGES = [
    { code: 'en', name: 'English', status: 'Active' },
    { code: 'ja', name: 'Japanese', status: 'Active' },
    { code: 'my', name: 'Burmese', status: 'Beta' },
    { code: 'th', name: 'Thai', status: 'Pending' },
];

export default function TranslationManagement() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tighter">Language Control</h2>
                <button className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-2xl text-[10px] font-black tracking-widest transition-all">
                    + ADD LANGUAGE
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {LANGUAGES.map((lang) => (
                    <div key={lang.code} className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-xl group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg border border-white/5">
                                🏳️
                            </div>
                            <span className={`text-[10px] font-black px-2 py-1 rounded-md ${
                                lang.status === 'Active' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'
                            }`}>
                                {lang.status.toUpperCase()}
                            </span>
                        </div>
                        <h3 className="font-black text-lg mb-1">{lang.name}</h3>
                        <p className="text-xs text-zinc-500 font-bold tracking-widest mb-6 uppercase">{lang.code}</p>
                        
                        <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase">
                            Edit Strings
                        </button>
                    </div>
                ))}
            </div>

            <div className="bg-zinc-900/40 rounded-3xl border border-white/5 p-8 backdrop-blur-xl">
                <h3 className="font-black text-sm uppercase tracking-widest text-zinc-500 mb-6">AI Translation Settings</h3>
                <div className="space-y-6 max-w-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold">Auto-translate messages</p>
                            <p className="text-xs text-zinc-500 font-medium mt-1">Automatically translate chat messages using AI.</p>
                        </div>
                        <div className="w-12 h-6 bg-pink-600 rounded-full relative">
                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold">Deep Validation</p>
                            <p className="text-xs text-zinc-500 font-medium mt-1">Cross-reference translations for maximum accuracy.</p>
                        </div>
                        <div className="w-12 h-6 bg-zinc-800 rounded-full relative">
                            <div className="absolute left-1 top-1 w-4 h-4 bg-white/20 rounded-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
