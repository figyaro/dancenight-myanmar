'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '../components/BottomNav';

export default function PostPage() {
    const router = useRouter();
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        // FIXME: Implement actual upload logic to Supabase Storage and Insert to DB
        setTimeout(() => {
            setIsSubmitting(false);
            router.push('/home'); // redirect after successful post
        }, 1500);
    };

    return (
        <div className="bg-black min-h-screen text-white">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-b border-zinc-800">
                <div className="max-w-md mx-auto flex items-center justify-between px-4 py-4">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-400 hover:text-white"
                    >
                        キャンセル
                    </button>
                    <h1 className="text-lg font-bold">新規投稿</h1>
                    <button
                        onClick={handleSubmit}
                        disabled={!content.trim() || isSubmitting}
                        className="text-pink-500 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? '投稿中...' : '投稿する'}
                    </button>
                </div>
            </header>

            <main className="pt-20 pb-24 px-4 max-w-md mx-auto">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Image / Video Upload Placeholder */}
                    <div className="w-full aspect-video bg-zinc-900 rounded-xl border border-dashed border-zinc-700 flex flex-col items-center justify-center text-zinc-500 hover:bg-zinc-800 transition-colors cursor-pointer">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                        <span className="text-sm">画像または動画を選択</span>
                    </div>

                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="キャプションを入力..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500 min-h-[120px] resize-none"
                    />
                </form>
            </main>

            <BottomNav />
        </div>
    );
}
