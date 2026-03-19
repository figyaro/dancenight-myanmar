'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';

// Platforms definition
const PLATFORMS = [
    { id: 'tiktok', name: 'TikTok', icon: 'M21 2h-4c-1.1 0-2 .9-2 2v10.51a5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5c1 0 1.93.28 2.76.78V4h-2a2 2 0 0 0-2 2H6c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2.17c.56-.63 1.34-1.04 2.22-1.16V2h2.78A6.983 6.983 0 0 0 21 8h-4c0-1.1-.9-2-2-2z' },
    { id: 'facebook', name: 'Facebook', icon: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z' },
    { id: 'instagram', name: 'Instagram', icon: 'M21 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M17.5 6.5h.01' },
    { id: 'viber', name: 'Viber', icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' },
    { id: 'telegram', name: 'Telegram', icon: 'M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z' }
];

export default function SnsGenerator() {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('tiktok');
    const [settings, setSettings] = useState<any>({});
    const [posts, setPosts] = useState<any[]>([]);
    const [viralUrl, setViralUrl] = useState('');
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: settingsData } = await supabase.from('sns_settings').select('*');
            const { data: postsData } = await supabase.from('sns_posts').select('*').order('scheduled_at', { ascending: true });
            
            if (settingsData) {
                const settingsMap = settingsData.reduce((acc: any, curr: any) => {
                    acc[curr.platform] = curr;
                    return acc;
                }, {});
                setSettings(settingsMap);
            }
            if (postsData) {
                setPosts(postsData);
            }
        } catch (err) {
            console.error("Failed to load SNS data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!viralUrl) return alert('Please enter a viral URL or description.');
        setGenerating(true);
        try {
            const res = await fetch('/api/admin/sns/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: activeTab, viralUrl })
            });
            const data = await res.json();
            if (data.success) {
                alert('Successfully generated and scheduled posts!');
                setViralUrl('');
                loadData();
            } else {
                alert('Generation failed: ' + data.error);
            }
        } catch (err: any) {
            alert('Error generating posts: ' + err.message);
        } finally {
            setGenerating(false);
        }
    };

    const saveSettings = async (platform: string, newSettings: any) => {
        try {
            await supabase.from('sns_settings').upsert({
                platform,
                ...newSettings
            });
            loadData();
            alert('Settings saved!');
        } catch (err: any) {
            alert('Failed to save settings: ' + err.message);
        }
    };

    if (loading) return <LoadingScreen />;

    const currentSettings = settings[activeTab] || { is_active: false, posts_per_day_min: 3, posts_per_day_max: 5, credentials: {} };
    const upcomingPosts = posts.filter(p => p.platform === activeTab && p.status === 'pending');
    const pastPosts = posts.filter(p => p.platform === activeTab && p.status !== 'pending');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter mb-1">SNS Generator</h1>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">AI-Driven Auto Posting & Viral Analysis</p>
            </div>

            {/* Platform Tabs */}
            <div className="flex gap-2 p-1 bg-zinc-900 border border-white/5 rounded-2xl overflow-x-auto scrollbar-hide">
                {PLATFORMS.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setActiveTab(p.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all cursor-pointer font-black text-[10px] tracking-widest uppercase flex-shrink-0 ${
                            activeTab === p.id 
                            ? 'bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-lg shadow-pink-900/20' 
                            : 'text-zinc-500 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d={p.icon} />
                        </svg>
                        {p.name}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Generation Control */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-zinc-900 rounded-2xl border border-white/5 p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        
                        <div className="relative z-10 space-y-4">
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-pink-500"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                                    Create Viral Campaign
                                </h3>
                                <p className="text-xs text-zinc-500 font-medium">Input a trending video URL or topic, and Gemini AI will generate human-like captions to drive traffic to Dance Together.</p>
                            </div>

                            <textarea 
                                value={viralUrl}
                                onChange={(e) => setViralUrl(e.target.value)}
                                placeholder="Paste TikTok/Insta URL, or describe a viral concept..."
                                className="w-full h-32 bg-black/50 border border-white/10 rounded-xl p-4 text-white text-sm focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all resize-none font-medium placeholder:text-zinc-600"
                            />

                            <button
                                onClick={handleGenerate}
                                disabled={generating || !currentSettings.is_active}
                                className="w-full py-4 rounded-xl bg-white text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-pink-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generating ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                                        Analyzing & Generating...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                        Auto-Schedule Viral Posts
                                    </>
                                )}
                            </button>
                            {!currentSettings.is_active && (
                                <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center mt-2">
                                    ⚠️ Enable integration in settings first
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Schedule Queue */}
                    <div className="bg-zinc-900 rounded-2xl border border-white/5 overflow-hidden">
                        <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center">
                            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Upcoming Posts ({upcomingPosts.length})</h3>
                        </div>
                        <div className="p-4 space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                            {upcomingPosts.length === 0 ? (
                                <div className="text-center py-8 text-zinc-600 text-xs font-bold uppercase tracking-widest">No posts queued</div>
                            ) : upcomingPosts.map((post) => (
                                <div key={post.id} className="bg-black/40 border border-white/5 rounded-xl p-4 flex gap-4 items-start">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-zinc-500 shrink-0">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] text-pink-500 font-black uppercase tracking-widest">
                                                {new Date(post.scheduled_at).toLocaleString()}
                                            </span>
                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold tracking-widest uppercase border border-white/5">Pending</span>
                                        </div>
                                        <p className="text-sm text-zinc-300 font-medium line-clamp-2">{post.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Settings & Credentials */}
                <div className="space-y-6">
                    <div className="bg-zinc-900 rounded-2xl border border-white/5 p-6">
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Settings</h3>
                        
                        <div className="space-y-5">
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-widest text-white">Active Status</p>
                                    <p className="text-[10px] text-zinc-500 font-bold tracking-tight">Enable automated posting</p>
                                </div>
                                <button 
                                    onClick={() => saveSettings(activeTab, { ...currentSettings, is_active: !currentSettings.is_active })}
                                    className={`w-12 h-6 rounded-full relative transition-colors ${currentSettings.is_active ? 'bg-pink-500' : 'bg-zinc-700'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${currentSettings.is_active ? 'translate-x-6.5 left-0.5' : 'translate-x-0.5'} shadow-sm`} />
                                </button>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Daily Post Frequency</label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="number" 
                                        value={currentSettings.posts_per_day_min}
                                        onChange={e => saveSettings(activeTab, { ...currentSettings, posts_per_day_min: parseInt(e.target.value) })}
                                        className="w-16 bg-black border border-white/10 rounded-lg p-2 text-center text-xs font-bold text-white focus:border-pink-500 outline-none"
                                        min="1" max="10"
                                    />
                                    <span className="text-zinc-500 font-bold text-xs uppercase tracking-widest">TO</span>
                                    <input 
                                        type="number" 
                                        value={currentSettings.posts_per_day_max}
                                        onChange={e => saveSettings(activeTab, { ...currentSettings, posts_per_day_max: parseInt(e.target.value) })}
                                        className="w-16 bg-black border border-white/10 rounded-lg p-2 text-center text-xs font-bold text-white focus:border-pink-500 outline-none"
                                        min="1" max="10"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">API Credentials</label>
                                <textarea 
                                    value={JSON.stringify(currentSettings.credentials, null, 2)}
                                    onChange={e => {
                                        try {
                                            const creds = JSON.parse(e.target.value);
                                            saveSettings(activeTab, { ...currentSettings, credentials: creds });
                                        } catch(err) {
                                            // Invalid JSON during type
                                        }
                                    }}
                                    className="w-full h-32 bg-black/50 border border-white/10 rounded-xl p-3 text-emerald-400 font-mono text-[10px] focus:border-pink-500 outline-none resize-none"
                                    placeholder='{ "bot_token": "..." }'
                                    spellCheck={false}
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
