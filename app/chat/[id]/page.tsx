'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { t } from '../../../lib/i18n';

export default function ChatRoom() {
    const params = useParams();
    const router = useRouter();
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [user, setUser] = useState<any>(null);
    const [partner, setPartner] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState<string>('日本語');
    const [lastSeenText, setLastSeenText] = useState<string>('Offline');
    const scrollRef = useRef<HTMLDivElement>(null);
    const statusInterval = useRef<any>(null);

    useEffect(() => {
        const initChat = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                router.push('/login');
                return;
            }
            setUser(authUser);

            // Fetch user preference
            const { data: pref } = await supabase
                .from('users')
                .select('language')
                .eq('id', authUser.id)
                .single();
            if (pref?.language) setLanguage(pref.language);

            // Fetch conversation and partner info
            console.log('DEBUG: Fetching conversation for ID:', params.id);
            const { data: conversation, error: convError } = await supabase
                .from('conversations')
                .select('participants')
                .eq('id', params.id)
                .single();

            if (convError) {
                console.error('DEBUG: Error fetching conversation:', convError);
            }

            if (conversation?.participants) {
                console.log('DEBUG: Participants:', conversation.participants);
                const partnerId = conversation.participants.find((p: string) => p !== authUser.id);
                console.log('DEBUG: Partner ID detected:', partnerId);
                if (partnerId) {
                    const { data: partnerData, error: pError } = await supabase
                        .from('users')
                        .select('id, nickname, avatar_url, updated_at')
                        .eq('id', partnerId)
                        .single();

                    if (pError) console.error('DEBUG: Error fetching partner Data:', pError);

                    if (partnerData) {
                        console.log('DEBUG: Partner Data Found:', partnerData);
                        setPartner(partnerData);
                        // updateLastSeen will be handled by the effect below
                    } else {
                        console.warn('DEBUG: No partner data found in "users" table for ID:', partnerId);
                    }
                } else {
                    console.warn('DEBUG: No partner ID found in participants list');
                }
            } else {
                console.warn('DEBUG: Conversation not found or has no participants');
            }

            // Fetch initial messages
            const { data: initialMessages } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', params.id)
                .order('created_at', { ascending: true });

            if (initialMessages) setMessages(initialMessages);
            setLoading(false);
        };

        initChat();

        // Real-time subscription for new messages
        const channel = supabase
            .channel(`room:${params.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${params.id}`
            }, (payload) => {
                setMessages((prev) => [...prev, payload.new]);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [params.id, router]);

    // Separate effect for partner status and real-time profile updates
    useEffect(() => {
        if (!partner) return;

        const updateLastSeen = (lastSeen: string | null) => {
            if (!lastSeen) {
                setLastSeenText('Offline');
                return;
            }
            const lastSeenDate = new Date(lastSeen);
            const now = new Date();
            const diffMs = now.getTime() - lastSeenDate.getTime();
            const diffMin = Math.floor(diffMs / 60000);

            if (diffMin < 2) setLastSeenText('Online');
            else if (diffMin < 60) setLastSeenText(`${diffMin}m ago`);
            else if (diffMin < 1440) setLastSeenText(`${Math.floor(diffMin / 60)}h ago`);
            else setLastSeenText(`${Math.floor(diffMin / 1440)}d ago`);
        };

        // Initial update
        updateLastSeen(partner.last_seen);

        // Update every minute (no closure trap because we depend on partner)
        const interval = setInterval(() => {
            updateLastSeen(partner.updated_at || partner.created_at);
        }, 60000);

        // Subscription for this specific partner's profile/status changes
        const partnerChannel = supabase
            .channel(`partner-presence:${partner.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `id=eq.${partner.id}`
            }, (payload) => {
                console.log('DEBUG: Partner Real-time Update:', payload.new);
                setPartner(payload.new);
            })
            .subscribe();

        return () => {
            clearInterval(interval);
            supabase.removeChannel(partnerChannel);
        };
    }, [partner]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || !user) return;

        // AI Translation logic (Simulated for now, would typically call an LLM API)
        const generateTranslations = (text: string) => {
            // This is a placeholder for actual AI translation API calls
            // In a production app, you would call a serverless function here
            return {
                ja: text, // Assuming original is JA for this mock
                en: `[AI Trans] ${text} (Translated to English)`,
                my: `[AI Trans] ${text} (Translated to Myanmar)`
            };
        };

        const translated = generateTranslations(inputText);

        const newMessage = {
            conversation_id: params.id,
            sender_id: user.id,
            content: inputText,
            translated_content: translated,
            created_at: new Date().toISOString(),
        };

        setInputText('');

        const { error } = await supabase
            .from('messages')
            .insert([newMessage]);

        if (error) {
            console.error('Detailed Insert Error:', error);
            alert(`送信エラー: ${error.message || '不明なエラー（UUIDの形式や権限を確認してください）'}`);

            // If table doesn't exist or insert fails, we still show the message locally for UI testing
            const localMsg = { ...newMessage, id: Math.random().toString() };
            setMessages((prev) => [...prev, localMsg]);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
            {/* Header: Glassmorphism */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-2xl border-b border-white/5 h-16 flex items-center px-4 justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>
                    <div
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity active:scale-95 duration-200"
                        onClick={() => partner?.id && router.push(`/profile/${partner.id}`)}
                    >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 p-[1.5px] overflow-hidden">
                            <div className="w-full h-full rounded-full bg-zinc-900 border border-black flex items-center justify-center text-sm overflow-hidden">
                                {partner?.avatar_url ? (
                                    <img src={partner.avatar_url} alt={partner.nickname} className="w-full h-full object-cover" />
                                ) : (
                                    <span>👤</span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-black tracking-tight">{partner?.nickname || 'Chat Room'}</span>
                            <span className="text-[10px] text-zinc-500 font-bold flex items-center gap-1 uppercase tracking-widest">
                                <span className={`w-1.5 h-1.5 rounded-full ${lastSeenText === 'Online' ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`}></span>
                                {lastSeenText}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <main
                ref={scrollRef}
                className="flex-1 overflow-y-auto pt-20 pb-24 px-4 space-y-6 scroll-smooth"
            >
                {messages.length === 0 && !loading && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                        <div className="text-4xl">💬</div>
                        <p className="text-xs font-black tracking-[0.2em] uppercase">No messages yet</p>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const isOwn = msg.sender_id === user?.id;
                    return (
                        <div
                            key={msg.id || idx}
                            className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
                        >
                            <div className={`
                                max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-2xl relative group
                                ${isOwn
                                    ? 'bg-gradient-to-br from-pink-600 to-rose-500 text-white rounded-tr-none'
                                    : 'bg-zinc-900/80 backdrop-blur-md border border-white/5 text-zinc-100 rounded-tl-none'}
                            `}>
                                <p className="leading-relaxed font-medium">{msg.content}</p>

                                {/* AI Translation UI */}
                                {!isOwn && msg.translated_content?.[language === '日本語' ? 'ja' : 'en'] && (
                                    <div className="mt-2 pt-2 border-t border-white/10 text-[11px] text-zinc-400 font-semibold italic">
                                        <div className="flex items-center gap-1 mb-1 text-[9px] uppercase tracking-wider text-pink-400/70">
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20 15.3 15.3 0 0 1 0-20" /></svg>
                                            Translated
                                        </div>
                                        {msg.translated_content[language === '日本語' ? 'ja' : 'en']}
                                    </div>
                                )}
                            </div>
                            <span className="text-[9px] font-black text-zinc-600 mt-1 uppercase tracking-tighter">
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    );
                })}
            </main>

            {/* Input Bar: Futuristic Fixed */}
            <div className="fixed bottom-0 left-0 right-0 p-4 pb-8 bg-gradient-to-t from-black via-black/90 to-transparent">
                <form
                    onSubmit={handleSendMessage}
                    className="max-w-md mx-auto flex items-center gap-2 bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-full p-1.5 pl-5 focus-within:border-pink-500/50 transition-colors shadow-2xl"
                >
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent py-2 text-sm focus:outline-none placeholder:text-zinc-600 font-medium"
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim()}
                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-95 active:scale-90 transition-all disabled:opacity-20 disabled:grayscale"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                </form>
            </div>
        </div>
    );
}
