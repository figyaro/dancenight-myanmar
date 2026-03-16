'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

/**
 * Transforms various Google Maps URL formats into an embeddable iframe source.
 */
function getMapEmbedUrl(url: string, shopName: string, area: string) {
    if (!url) return null;
    if (url.includes('/embed') || (url.includes('google.com/maps') && url.includes('output=embed'))) {
        return url;
    }
    const latLngMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (latLngMatch) {
        return `https://maps.google.com/maps?q=${latLngMatch[1]},${latLngMatch[2]}&hl=en&z=15&output=embed`;
    }
    // Check if the address field itself is a URL (contains http)
    if (url.includes('http')) {
        const query = encodeURIComponent(`${shopName} ${area}`);
        return `https://maps.google.com/maps?q=${query}&hl=en&output=embed`;
    }
    return null;
}

export default function ShopSettings() {
    const { shopId } = useParams();
    const [shop, setShop] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Set a local preview immediately
        const localUrl = URL.createObjectURL(file);
        setShop({ ...shop, main_image_url: localUrl });
        setIsUploading(true);

        try {
            const { uploadMedia } = await import('../../../../lib/media-upload');
            const { url, error } = await uploadMedia(file, 'shops');

            if (error) throw new Error(error);

            // 2. Set the actual CDN URL
            setShop({ ...shop, main_image_url: url });
        } catch (error: any) {
            alert('Error uploading image: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    const embedUrl = getMapEmbedUrl(shop?.address || '', shop?.name || '', shop?.area || '');

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
                {['general', 'appearance', 'hours', 'location', 'branches'].map((tab) => (
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 block">Category</label>
                                    <select 
                                        value={shop?.category || 'Club'} 
                                        onChange={e => setShop({...shop, category: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none appearance-none"
                                    >
                                        <option value="Club">Club</option>
                                        <option value="KTV">KTV</option>
                                        <option value="Restaurant&Bar">Restaurant&Bar</option>
                                        <option value="SPA">SPA</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 block">Phone</label>
                                    <input 
                                        type="text" 
                                        value={shop?.phone || ''} 
                                        onChange={e => setShop({...shop, phone: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                                        placeholder="09..."
                                    />
                                </div>
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

                {activeTab === 'appearance' && (
                    <div className="space-y-8 animate-in slide-in-from-left-4 duration-500">
                        <h3 className="text-xs font-black text-pink-500 tracking-widest uppercase border-l-2 border-pink-500 pl-4">Brand Image</h3>
                        <div className="flex items-center gap-10">
                            <div className="w-64 aspect-[3/2] rounded-3xl bg-zinc-800 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group shadow-2xl">
                                {shop?.main_image_url ? (
                                    <img 
                                        key={shop.main_image_url}
                                        src={shop.main_image_url} 
                                        className={`w-full h-full object-cover transition-opacity duration-300 ${isUploading ? 'opacity-40' : 'opacity-100'}`} 
                                        alt="Shop Preview" 
                                    />
                                ) : (
                                    <div className="text-zinc-600 text-xs font-bold">NO MAIN PHOTO</div>
                                )}
                                
                                {isUploading && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px]">
                                        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mb-2" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Uploading...</span>
                                    </div>
                                )}

                                <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity backdrop-blur-sm">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{isUploading ? 'Processing...' : 'Update Photo'}</span>
                                    {!isUploading && <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />}
                                </label>
                            </div>
                            <div className="space-y-3">
                                <p className="text-sm font-bold">This is your shop's primary visual.</p>
                                <ul className="text-xs text-zinc-500 font-medium space-y-1 ml-4 list-disc">
                                    <li>Appears in search results</li>
                                    <li>Featured on top of your shop page</li>
                                    <li>Format: JPG, PNG, WEBP</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'hours' && (
                    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                        <div className="max-w-md">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Opening Hours Summary</label>
                            <input 
                                type="text" 
                                value={shop?.opening_hours || ''} 
                                onChange={e => setShop({...shop, opening_hours: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50 mb-6"
                                placeholder="e.g. 19:00 - 02:00"
                            />

                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Closed Day (Holiday)</label>
                            <input 
                                type="text" 
                                value={shop?.holiday || ''} 
                                onChange={e => setShop({...shop, holiday: e.target.value})}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                                placeholder="e.g. Sunday"
                            />
                        </div>

                        <div className="pt-8 border-t border-white/5 opacity-50 pointer-events-none">
                            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Detailed Daily Schedule (Coming Soon)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                    <div key={day} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                                        <span className="text-sm font-black">{day}</span>
                                        <div className="flex gap-3">
                                            <input type="text" placeholder="18:00" readOnly className="w-20 bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-center text-xs font-bold" />
                                            <span className="text-zinc-500">to</span>
                                            <input type="text" placeholder="04:00" readOnly className="w-20 bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-center text-xs font-bold" />
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                        onChange={e => setShop({...shop, address: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:border-pink-500/50"
                                    />
                                    <p className="text-[9px] text-zinc-500 mt-2 font-medium italic">Tip: Paste a Google Maps share link to see a live preview.</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Area / District</label>
                                    <input 
                                        type="text" 
                                        value={shop?.area || ''} 
                                        onChange={e => setShop({...shop, area: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50" 
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">City / Region</label>
                                    <input 
                                        type="text" 
                                        value={shop?.location || ''} 
                                        onChange={e => setShop({...shop, location: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50" 
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-zinc-800/50 rounded-3xl border border-white/5 overflow-hidden flex flex-col min-h-[300px] shadow-2xl relative">
                                {embedUrl ? (
                                    <iframe 
                                        src={embedUrl}
                                        className="w-full h-full border-0 absolute inset-0"
                                        allowFullScreen
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    />
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-2xl mb-4">📍</div>
                                        <h4 className="font-black text-sm mb-2">Google Maps Integration</h4>
                                        <p className="text-xs text-zinc-500 font-medium mb-6">Drop a pin to help customers find you easily.</p>
                                        <button className="px-6 py-3 bg-white text-black rounded-xl text-[10px] font-black tracking-widest uppercase cursor-default opacity-50">Map Preview Ready</button>
                                    </div>
                                )}
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
