'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import BottomNav from '../components/BottomNav';

const mockMessages = [
    {
        id: 1,
        name: 'Aung San K-POP',
        avatar: '🎤',
        lastMessage: '今夜21時にお待ちしています！💖',
        time: '10:42',
        unread: 2,
    },
    {
        id: 2,
        name: 'Moe Moe Dance',
        avatar: '💃',
        lastMessage: '場所はどこにしますか？',
        time: '昨日',
        unread: 0,
    },
    {
        id: 3,
        name: 'Sono Club VIP',
        avatar: '🏆',
        lastMessage: '予約完了しました。ありがとうございます。',
        time: '月曜日',
        unread: 0,
    },
    {
        id: 4,
        name: '運営サポート',
        avatar: '🛟',
        lastMessage: 'ご利用ありがとうございます。何かお困りの...',
        time: '2/15',
        unread: 0,
    },
];

function ChatContent() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<'messages' | 'requests'>('messages');

    useEffect(() => {
        if (tabParam === 'requests') {
            setActiveTab('requests');
        } else {
            setActiveTab('messages');
        }
    }, [tabParam]);

    return (
        <div className="bg-black min-h-screen text-white">
            {/* ヘッダー */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur border-b border-zinc-800">
                <div className="max-w-md mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-2xl font-bold">チャット</h1>
                        <button className="text-gray-400 hover:text-white">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                        </button>
                    </div>

                    {/* タブ */}
                    <div className="flex border-b border-zinc-800">
                        <button
                            onClick={() => setActiveTab('messages')}
                            className={`flex-1 py-2 text-center text-sm font-medium transition-colors relative ${activeTab === 'messages' ? 'text-white' : 'text-gray-500'
                                }`}
                        >
                            メッセージ
                            {activeTab === 'messages' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500 rounded-t-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`flex-1 py-2 text-center text-sm font-medium transition-colors relative ${activeTab === 'requests' ? 'text-white' : 'text-gray-500'
                                }`}
                        >
                            リクエスト
                            {activeTab === 'requests' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500 rounded-t-full" />
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-28 pb-20">
                <div className="max-w-md mx-auto">
                    {activeTab === 'messages' ? (
                        mockMessages.map((msg) => (
                            <button
                                key={msg.id}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition-colors border-b border-zinc-800/50"
                            >
                                {/* アバター */}
                                <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-2xl flex-shrink-0">
                                    {msg.avatar}
                                </div>

                                {/* メッセージ情報 */}
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium truncate">{msg.name}</span>
                                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{msg.time}</span>
                                    </div>
                                    <p className="text-sm text-gray-400 truncate mt-0.5">{msg.lastMessage}</p>
                                </div>

                                {/* 未読バッジ */}
                                {msg.unread > 0 && (
                                    <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {msg.unread}
                                    </div>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-10 text-center text-zinc-500">
                            <p>リクエストはまだありません。</p>
                        </div>
                    )}
                </div>
            </main>

            <BottomNav />
        </div>
    );
}

export default function Chat() {
    return (
        <Suspense fallback={
            <div className="bg-black min-h-screen flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-pink-500 border-t-transparent rounded-full" />
            </div>
        }>
            <ChatContent />
        </Suspense>
    );
}
