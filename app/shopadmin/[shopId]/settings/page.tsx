'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

export default function ShopSettings() {
    const { shopId } = useParams();
    const [shop, setShop] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('general');

    useEffect(() => {
        const fetchShop = async () => {
            const { data } = await supabase.from('shops').select('*').eq('id', shopId).single();
            setShop(data);
            setLoading(false);
        };
        if (shopId) fetchShop();
    }, [shopId]);

    const handleSave = async () => {
        const { error } = await supabase.from('shops').update(shop).eq('id', shopId);
        if (error) alert(error.message);
        else alert('Settings saved successfully!');
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="max-w-5xl space-y-10 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black tracking-tight">Shop Configuration</h2>
                    <p className="text-zinc-500 text-sm font-medium">Manage your shop visibility, hours, and branch network.</p>
                </div>
                <button 
                    onClick={handleSave}
                    className="px-8 py-4 bg-pink-600 hover:bg-pink-500 rounded-2xl text-[10px] font-black tracking-widest transition-all shadow-xl shadow-pink-900/20"
                >
                    SAVE CHANGES
                </button>
            </div>

            <div className="flex gap-4 p-1.5 bg-zinc-900/50 rounded-2xl border border-white/5 w-fit">
                {['general', 'hours', 'location', 'branches'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${
                            activeTab === tab ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] p-10 backdrop-blur-3xl min-h-[400px]">
                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-left-4 duration-500">
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 block">Shop Display Name</label>
                                <input 
                                    type="text" 
                                    value={shop?.name || ''} 
                                    onChange={e => setShop({...shop, name: e.target.value})}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 block">Store Category</label>
                                <select 
                                    value={shop?.category || 'Club'} 
                                    onChange={e => setShop({...shop, category: e.target.value})}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none appearance-none"
                                >
                                    <option value="Club">Club</option>
                                    <option value="KTV">KTV</option>
                                    <option value="Restaurant">Restaurant</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 block">Shop Introduction (About)</label>
                            <textarea 
                                rows={6}
                                value={shop?.description || ''} 
                                onChange={e => setShop({...shop, description: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium leading-relaxed outline-none focus:border-pink-500/50"
                                placeholder="Describe your shop to potential customers..."
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'hours' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                <div key={day} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                                    <span className="text-sm font-black">{day}</span>
                                    <div className="flex gap-3">
                                        <input type="text" placeholder="18:00" className="w-20 bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-center text-xs font-bold" />
                                        <span className="text-zinc-500">to</span>
                                        <input type="text" placeholder="04:00" className="w-20 bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-center text-xs font-bold" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'location' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Physical Address</label>
                                    <textarea 
                                        rows={3}
                                        value={shop?.address || ''} 
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Area / District</label>
                                    <input type="text" value={shop?.area || ''} className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold" />
                                </div>
                            </div>
                            <div className="bg-zinc-800/50 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center p-8">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-2xl mb-4">📍</div>
                                <h4 className="font-black text-sm mb-2">Google Maps Integration</h4>
                                <p className="text-xs text-zinc-500 font-medium mb-6">Drop a pin to help customers find you easily.</p>
                                <button className="px-6 py-3 bg-white text-black rounded-xl text-[10px] font-black tracking-widest uppercase">Select on Map</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'branches' && (
                    <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-500">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-3xl mb-6">🏘️</div>
                        <h3 className="text-xl font-black mb-3 text-zinc-300">Expand Your Business</h3>
                        <p className="text-sm text-zinc-500 max-w-sm text-center font-medium leading-relaxed mb-8">
                            Managing multiple locations? Add branches here to sync your menu, posts, and staff across all sites.
                        </p>
                        <button className="px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase transition-all">
                            CREATE BRANCH
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
