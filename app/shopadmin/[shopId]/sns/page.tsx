'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

interface SNSLink {
    url: string;
    isActive: boolean;
    metadata?: any;
}

interface SNSLinks {
    [key: string]: SNSLink;
}

const Logos = {
    Facebook: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
    ),
    Instagram: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
    ),
    TikTok: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743 2.897 2.897 0 0 1 2.31-4.642 2.913 2.913 0 0 1 .835.125V9.43a6.83 6.83 0 0 0-1-.05A6.334 6.334 0 0 0 5 20.1a6.348 6.348 0 0 0 10.862-4.43V8.517a8.167 8.167 0 0 0 4.774 1.517V6.686h-.047z"/></svg>
    ),
    X: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153zM17.61 20.644h2.039L6.486 3.24H4.298l13.312 17.404z"/></svg>
    ),
    Viber: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.696 6.7.633 9.817.57 12.933.488 18.776 6.12 20.36h.003l-.004 2.416s-.037.977.61 1.177c.777.242 1.234-.5 1.98-1.302.407-.44.972-1.084 1.397-1.58 3.85.326 6.812-.416 7.15-.525.776-.252 5.176-.816 5.892-6.657.74-6.02-.36-9.83-2.34-11.546-.596-.55-3.006-2.3-8.375-2.323 0 0-.395-.025-1.037-.017zm.058 1.693c.545-.004.88.017.88.017 4.542.02 6.717 1.388 7.222 1.846 1.675 1.435 2.53 4.868 1.906 9.897v.002c-.604 4.878-4.174 5.184-4.832 5.395-.28.09-2.882.737-6.153.524 0 0-2.436 2.94-3.197 3.704-.12.12-.26.167-.352.144-.13-.033-.166-.188-.165-.414l.02-4.018c-4.762-1.32-4.485-6.292-4.43-8.895.054-2.604.543-4.738 1.996-6.173 1.96-1.773 5.474-2.018 7.11-2.03zm.38 2.602c-.167 0-.303.135-.304.302 0 .167.133.303.3.305 1.624.01 2.946.537 4.028 1.592 1.073 1.046 1.62 2.468 1.633 4.334.002.167.14.3.307.3.166-.002.3-.138.3-.304-.014-1.984-.618-3.596-1.816-4.764-1.19-1.16-2.692-1.753-4.447-1.765zm-3.96.695c-.19-.032-.4.005-.616.117l-.01.002c-.43.247-.816.562-1.146.932-.002.004-.006.004-.008.008-.267.323-.42.638-.46.948-.008.046-.01.093-.007.14 0 .136.022.27.065.4l.013.01c.135.48.473 1.276 1.205 2.604.42.768.903 1.5 1.446 2.186.27.344.56.673.87.984l.132.132c.31.308.64.6.984.87.686.543 1.418 1.027 2.186 1.447 1.328.733 2.126 1.07 2.604 1.206l.01.014c.13.042.265.064.402.063.046.002.092 0 .138-.008.31-.036.627-.19.948-.46.004 0 .003-.002.008-.005.37-.33.683-.72.93-1.148l.003-.01c.225-.432.15-.842-.18-1.12-.004 0-.698-.58-1.037-.83-.36-.255-.73-.492-1.113-.71-.51-.285-1.032-.106-1.248.174l-.447.564c-.23.283-.657.246-.657.246-3.12-.796-3.955-3.955-3.955-3.955s-.037-.426.248-.656l.563-.448c.277-.215.456-.737.17-1.248-.217-.383-.454-.756-.71-1.115-.25-.34-.826-1.033-.83-1.035-.137-.165-.31-.265-.502-.297zm4.49.88c-.158.002-.29.124-.3.282-.01.167.115.312.282.324 1.16.085 2.017.466 2.645 1.15.63.688.93 1.524.906 2.57-.002.168.13.306.3.31.166.003.305-.13.31-.297.025-1.175-.334-2.193-1.067-2.994-.74-.81-1.777-1.253-3.05-1.346h-.024zm.463 1.63c-.16.002-.29.127-.3.287-.008.167.12.31.288.32.523.028.875.175 1.113.422.24.245.388.62.416 1.164.01.167.15.295.318.287.167-.008.295-.15.287-.317-.03-.644-.215-1.178-.58-1.557-.367-.378-.893-.574-1.52-.607h-.018Z"/>
        </svg>
    ),
    Telegram: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.56 8.29l-1.91 9c-.14.63-.52.79-1.05.49l-2.91-2.15-1.41 1.36c-.16.15-.29.28-.59.28l.21-2.93 5.34-4.82c.23-.21-.05-.32-.36-.12l-6.61 4.16-2.84-.89c-.61-.19-.62-.61.13-.9l11.07-4.27c.51-.19.96.11.78.89z"/>
        </svg>
    ),
    WhatsApp: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
    ),
    LINE: () => (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
        </svg>
    ),
};

const SNS_PLATFORMS = [
    { 
        id: 'facebook', 
        name: 'Facebook', 
        icon: Logos.Facebook, 
        placeholder: 'https://facebook.com/yourpage',
        description: 'Primary page for updates and events.',
        color: 'bg-[#1877F2] text-white'
    },
    { 
        id: 'instagram', 
        name: 'Instagram', 
        icon: Logos.Instagram, 
        placeholder: '@yourhandle',
        description: 'Vibrant photos and short clips.',
        color: 'bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white'
    },
    { 
        id: 'tiktok', 
        name: 'TikTok', 
        icon: Logos.TikTok, 
        placeholder: '@yourhandle',
        description: 'Trending dance and viral content.',
        color: 'bg-black text-white'
    },
    { 
        id: 'x', 
        name: 'X (Twitter)', 
        icon: Logos.X, 
        placeholder: '@yourhandle',
        description: 'Real-time news and announcements.',
        color: 'bg-black text-white'
    },
    { 
        id: 'viber', 
        name: 'Viber', 
        icon: Logos.Viber, 
        placeholder: '+95...',
        description: 'Direct messaging and group chats.',
        color: 'bg-[#7360F2] text-white',
        isMessaging: true
    },
    { 
        id: 'telegram', 
        name: 'Telegram', 
        icon: Logos.Telegram, 
        placeholder: '@username',
        description: 'High-security chat and channels.',
        color: 'bg-[#26A5E4] text-white',
        isMessaging: true
    },
    { 
        id: 'whatsapp', 
        name: 'WhatsApp', 
        icon: Logos.WhatsApp, 
        placeholder: '+95...',
        description: 'Global messaging standard.',
        color: 'bg-[#25D366] text-white',
        isMessaging: true
    },
    { 
        id: 'line', 
        name: 'LINE', 
        icon: Logos.LINE, 
        placeholder: 'LINE ID or Link',
        description: 'Popular messaging in Asia.',
        color: 'bg-[#06C755] text-white',
        isMessaging: true
    }
];

export default function SNSIntegration() {
    const { shopId } = useParams();
    const [shop, setShop] = useState<any>(null);
    const [snsLinks, setSnsLinks] = useState<SNSLinks>({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchShop = async () => {
            const { data, error } = await supabase
                .from('shops')
                .select('*')
                .eq('id', shopId)
                .single();
            
            if (data) {
                setShop(data);
                setSnsLinks(data.sns_links || {});
            }
            setLoading(false);
        };
        if (shopId) fetchShop();
    }, [shopId]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('shops')
                .update({ sns_links: snsLinks })
                .eq('id', shopId);
            
            if (error) throw error;
            alert('SNS Integration saved successfully!');
        } catch (err: any) {
            alert('Error saving: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const updateLink = (id: string, value: string) => {
        let cleanValue = value.trim();
        
        // Specialized cleanup/validation
        if (id === 'instagram' && cleanValue.startsWith('@')) {
            cleanValue = `https://instagram.com/${cleanValue.substring(1)}`;
        } else if (id === 'tiktok' && cleanValue.startsWith('@')) {
            cleanValue = `https://tiktok.com/@${cleanValue.substring(1)}`;
        } else if (id === 'viber' && cleanValue && !cleanValue.includes('://')) {
            // Viber link format: viber://chat?number=+95...
            const digits = cleanValue.replace(/\D/g, '');
            if (digits) cleanValue = `viber://chat?number=${digits}`;
        } else if (id === 'whatsapp' && cleanValue && !cleanValue.includes('://')) {
            // WhatsApp link format: https://wa.me/95...
            const digits = cleanValue.replace(/\D/g, '');
            if (digits) cleanValue = `https://wa.me/${digits}`;
        }

        setSnsLinks(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                url: cleanValue,
                isActive: !!cleanValue
            }
        }));
    };

    const handleCopy = (url: string) => {
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="max-w-6xl space-y-10 animate-in fade-in duration-500 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black tracking-tight">SNS Integration</h2>
                    <p className="text-zinc-500 text-sm font-medium">Link your social media accounts to increase visibility and engagement.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end mr-4">
                        <span className="text-[10px] font-black text-green-500 tracking-widest uppercase mb-1">Live Status</span>
                        <span className="text-xs font-bold text-zinc-400">
                            {Object.values(snsLinks).filter(l => l.isActive).length} Accounts Coupled
                        </span>
                    </div>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 rounded-2xl text-[10px] font-black tracking-widest transition-all shadow-xl shadow-pink-900/20"
                    >
                        {isSaving ? 'SAVING...' : 'SAVE CONFIGURATION'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SNS_PLATFORMS.map((platform) => {
                    const data = snsLinks[platform.id] || { url: '', isActive: false };
                    
                    return (
                        <div key={platform.id} className="group bg-zinc-900/40 border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-all backdrop-blur-3xl flex flex-col gap-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl ${platform.color} flex items-center justify-center text-white shadow-lg shadow-black/20`}>
                                        <platform.icon />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm tracking-tight">{platform.name}</h3>
                                        <p className="text-[10px] font-black text-pink-500 tracking-widest uppercase">
                                            {platform.isMessaging ? 'Direct Message' : 'Social Profile'}
                                        </p>
                                    </div>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${data.isActive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-zinc-700'}`} />
                            </div>

                            <p className="text-xs text-zinc-500 font-medium leading-relaxed min-h-[40px]">
                                {platform.description}
                            </p>

                            <div className="space-y-4">
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={data.url}
                                        onChange={(e) => updateLink(platform.id, e.target.value)}
                                        placeholder={platform.placeholder}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:border-pink-500/50 transition-all placeholder:text-zinc-700"
                                    />
                                    {data.url && (
                                        <button 
                                            onClick={() => updateLink(platform.id, '')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                        </button>
                                    )}
                                </div>

                                {data.isActive && (
                                    <div className="flex gap-2">
                                        <a 
                                            href={data.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all border border-white/5 text-center flex items-center justify-center gap-2"
                                        >
                                            Test {platform.isMessaging ? 'Chat' : 'Link'}
                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>
                                        </a>
                                        <button 
                                            onClick={() => handleCopy(data.url)}
                                            className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 transition-all border border-white/5 active:scale-90"
                                            title="Copy Link"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/5 rounded-[2.5rem] p-10 mt-10">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-16 h-16 rounded-3xl bg-pink-600/10 flex items-center justify-center text-3xl">🤖</div>
                    <div>
                        <h3 className="text-xl font-black tracking-tight">Automated SNS Features</h3>
                        <p className="text-zinc-500 text-sm font-medium">Coming soon: leverage AI to handle SNS engagement.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        { title: 'Auto-Post Sync', desc: 'Sync your Shop Posts to Facebook and Instagram automatically.', icon: '🔄' },
                        { title: 'AI Chat Responder', desc: 'Auto-reply to common questions on WhatsApp and Viber.', icon: '💬' },
                        { title: 'In-Post QR Codes', desc: 'Generate QR codes in posts that link directly to your messaging channels.', icon: 'QR' },
                        { title: 'Campaign Analytics', desc: 'Track which SNS channel brings most reservations.', icon: '📊' }
                    ].map((feature, i) => (
                        <div key={i} className="flex gap-6 p-6 bg-white/5 rounded-3xl border border-white/5 opacity-50 relative group overflow-hidden">
                            <div className="absolute top-4 right-4 text-[8px] font-black bg-pink-600 text-white px-2 py-1 rounded-lg tracking-widest">SOON</div>
                            <div className="text-2xl pt-1">{feature.icon}</div>
                            <div>
                                <h4 className="font-black text-sm mb-1">{feature.title}</h4>
                                <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">{feature.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
