'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { getEffectiveUserId } from '../../lib/auth-util';
import BottomNav from '../components/BottomNav';
import LoadingScreen from '../components/LoadingScreen';

const mockConversations = [
    {
        id: '202245b7-7e62-4299-80ac-330513e9a49c',
        name: 'Aung San K-POP',
        avatar: '🎤',
        last_message: '今夜21時にお待ちしています！💖',
        updated_at: new Date().toISOString(),
        unread_count: 2,
    },
    {
        id: '98d5c952-473d-4c3d-8874-580798e9876a',
        name: 'Moe Moe Dance',
        avatar: '💃',
        last_message: '場所はどこにしますか？',
        updated_at: new Date(Date.now() - 3600000).toISOString(),
        unread_count: 0,
    }
];

function ChatContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState<'messages' | 'requests'>('messages');
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (tabParam === 'requests') {
            setActiveTab('requests');
        } else {
            setActiveTab('messages');
        }
    }, [tabParam]);

    useEffect(() => {
        const fetchConversations = async () => {
            setLoading(true);
            const userId = await getEffectiveUserId();
            if (!userId) {
                setLoading(false);
                return;
            }

            try {
                // 1. Fetch conversations where user is a participant
                const { data: convs, error: convError } = await supabase
                    .from('conversations')
                    .select('*')
                    .contains('participants', [userId])
                    .order('updated_at', { ascending: false });

                if (convError) throw convError;

                if (!convs || convs.length === 0) {
                    setConversations(mockConversations);
                    setLoading(false);
                    return;
                }

                // 2. Fetch partner profiles and last messages for each conversation
                const enrichedConversations = await Promise.all(convs.map(async (conv) => {
                    const partnerId = conv.participants.find((p: string) => p !== userId);

                    // Fetch partner user data
                    const { data: partnerData } = await supabase
                        .from('users')
                        .select('nickname, avatar_url')
                        .eq('id', partnerId)
                        .maybeSingle();

                    // Fetch last message
                    const { data: lastMsg } = await supabase
                        .from('messages')
                        .select('text, created_at')
                        .eq('conversation_id', conv.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    return {
                        id: conv.id,
                        name: partnerData?.nickname || 'Dancer',
                        avatar_url: partnerData?.avatar_url,
                        last_message: lastMsg?.text || 'メッセージがありません',
                        updated_at: conv.updated_at,
                        unread_count: 0, // Placeholder
                    };
                }));

                setConversations(enrichedConversations);
            } catch (err) {
                console.error('Error in fetchConversations:', err);
                setConversations(mockConversations);
            } finally {
                setLoading(false);
            }
        };

        fetchConversations();

        // Real-time subscription for messages to ensure list updates promptly
        const channel = supabase
            .channel('chat_list_updates')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
                fetchConversations();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);
    if (loading) return <LoadingScreen />;

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

            <main className="pt-32 pb-24 px-4">
                <div className="max-w-md mx-auto space-y-2">
                    {activeTab === 'messages' ? (
                        conversations.map((msg, index) => (
                            <button
                                key={msg.id}
                                onClick={() => router.push(`/chat/${msg.id}`)}
                                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/40 hover:bg-zinc-800/60 transition-all border border-white/5 backdrop-blur-md group animate-in fade-in slide-in-from-bottom-4 duration-500"
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                {/* アバター */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-2xl overflow-hidden group-hover:scale-105 transition-transform duration-500 bg-zinc-800">
                                        {msg.avatar_url ? (
                                            <img
                                                src={msg.avatar_url}
                                                alt={msg.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="opacity-50">👤</span>
                                        )}
                                    </div>
                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-black rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                </div>

                                {/* メッセージ情報 */}
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center justify-between mb-0.5">
                                        <span className="font-black text-sm tracking-tight text-zinc-100 group-hover:text-white transition-colors truncate pr-2">
                                            {msg.name}
                                        </span>
                                        <span className="text-[10px] font-bold text-zinc-500 bg-white/5 py-0.5 px-2 rounded-full flex-shrink-0">
                                            {msg.updated_at ? new Date(msg.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs text-zinc-400 truncate font-medium pr-4">
                                            {msg.last_message}
                                        </p>
                                        {msg.unread_count > 0 && (
                                            <div className="min-w-[18px] h-[18px] rounded-full bg-pink-600 flex items-center justify-center text-[10px] font-black shadow-[0_0_10px_rgba(219,39,119,0.5)] animate-pulse flex-shrink-0">
                                                {msg.unread_count}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4 animate-in fade-in zoom-in-95 duration-700">
                            <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center text-3xl opacity-50 border border-white/5">
                                📩
                            </div>
                            <p className="text-sm font-black text-zinc-500 tracking-widest uppercase">
                                No requests yet
                            </p>
                        </div>
                    )}
                </div>
            </main>

            <BottomNav />
        </div>
        );
    } catch (e) {
        console.error('Chat render error:', e);
        return <div className="p-10 text-center">Load Error</div>;
    }
}

export default function Chat() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <ChatContent />
        </Suspense>
    );
}
