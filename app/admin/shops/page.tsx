'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';
import SlideOver from '../components/SlideOver';
import ShopImagePlaceholder from '../../components/ShopImagePlaceholder';

export default function ShopManagement() {
    const [shops, setShops] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // UI state
    const [editingShop, setEditingShop] = useState<any>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Form state for new shop/user
    const [newShop, setNewShop] = useState({
        name: '',
        category: 'Club',
        area: '',
        location: '',
        address: '',
        description: '',
        owner_email: '',
        owner_nickname: '',
        plan_id: '',
        phone: '',
        holiday: '',
        opening_hours: '',
        main_image_url: ''
    });

    useEffect(() => {
        fetchShops();
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        const { data } = await supabase
            .from('plans')
            .select('*')
            .eq('type', 'shop')
            .order('price_monthly', { ascending: true });
        setPlans(data || []);
    };

    const fetchShops = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('shops')
            .select('*, plan:plans(name)')
            .order('name', { ascending: true });
        
        if (error) console.error('Error fetching shops:', error);
        else setShops(data || []);
        setLoading(false);
    };

    const handleEdit = (shop: any) => {
        setEditingShop({ ...shop });
        setIsAdding(false);
    };

    const handleAddClick = () => {
        setNewShop({
            name: '',
            category: 'Club',
            area: '',
            location: '',
            address: '',
            description: '',
            owner_email: '',
            owner_nickname: '',
            plan_id: '',
            phone: '',
            holiday: '',
            opening_hours: '',
            main_image_url: ''
        });
        setIsAdding(true);
        setEditingShop(null);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Immediate local preview
        const localUrl = URL.createObjectURL(file);
        if (isAdding) {
            setNewShop({ ...newShop, main_image_url: localUrl });
        } else {
            setEditingShop({ ...editingShop, main_image_url: localUrl });
        }
        setIsUploading(true);

        try {
            const { uploadMedia } = await import('../../../lib/media-upload');
            const { url, error } = await uploadMedia(file, 'shops');

            if (error) throw new Error(error);

            // 2. Set actual CDN URL
            if (isAdding) {
                setNewShop({ ...newShop, main_image_url: url });
            } else {
                setEditingShop({ ...editingShop, main_image_url: url });
            }
        } catch (error: any) {
            alert('Error uploading image: ' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!editingShop && !isAdding) return;
        setIsSaving(true);
        
        if (isAdding) {
            // Atomic Add Flow
            // 1. Create User
            const { data: userData, error: userError } = await supabase
                .from('users')
                .insert({
                    email: newShop.owner_email,
                    nickname: newShop.owner_nickname || newShop.name + ' Owner',
                    role: 'shop'
                })
                .select()
                .single();

            if (userError) {
                alert('Error creating shop user: ' + userError.message);
                setIsSaving(false);
                return;
            }

            // Provision Auth record immediately so they can login
            try {
                const { data: { session } } = await supabase.auth.getSession();
                await fetch('/api/admin/users/password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userData.id,
                        newPassword: 'ChangeMe123!', // Initial password
                        adminId: session?.user?.id
                    })
                });
            } catch (authErr) {
                console.error('Auth provisioning failed:', authErr);
            }

            // 2. Create Shop
            const { data: shopData, error: shopError } = await supabase
                .from('shops')
                .insert({
                    name: newShop.name,
                    category: newShop.category,
                    area: newShop.area,
                    location: newShop.location,
                    address: newShop.address,
                    description: newShop.description,
                    phone: newShop.phone,
                    holiday: newShop.holiday,
                    opening_hours: newShop.opening_hours,
                    main_image_url: newShop.main_image_url,
                    plan_id: newShop.plan_id || (plans.find(p => p.name === 'Shop Free')?.id)
                })
                .select()
                .single();

            if (shopError) {
                alert('Error creating shop: ' + shopError.message);
                setIsSaving(false);
                return;
            }

            // 3. Link them as owner
            const { error: memberError } = await supabase
                .from('shop_members')
                .insert({
                    shop_id: shopData.id,
                    user_id: userData.id,
                    role: 'owner'
                });

            if (memberError) {
                console.error('Error linking owner:', memberError);
                alert('Shop created but owner linkage failed. Please check members manually.');
            }

            alert('Shop and User created successfully!');
            setIsAdding(false);
            await fetchShops();

        } else {
            // Update Flow
            const { data, error } = await supabase
                .from('shops')
                .update({
                    name: editingShop.name,
                    category: editingShop.category,
                    location: editingShop.location,
                    description: editingShop.description,
                    area: editingShop.area,
                    address: editingShop.address,
                    phone: editingShop.phone,
                    holiday: editingShop.holiday,
                    opening_hours: editingShop.opening_hours,
                    main_image_url: editingShop.main_image_url,
                    plan_id: editingShop.plan_id
                })
                .eq('id', editingShop.id)
                .select();

            if (error) {
                alert('Error updating shop: ' + error.message);
            } else if (!data || data.length === 0) {
                alert('Save failed: RLS policies may be blocking the update. Please ensure you have run the RLS fix SQL script.');
            } else {
                await fetchShops();
                setEditingShop(null);
                alert('Shop updated successfully!');
            }
        }
        setIsSaving(false);
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black">Shop Registry</h2>
                <div className="flex gap-4">
                    <button 
                        onClick={handleAddClick}
                        className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-2xl text-[10px] font-black tracking-widest transition-all"
                    >
                        + ADD SHOP
                    </button>
                    <button onClick={fetchShops} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-[10px] font-black tracking-widest transition-all">
                        REFRESH
                    </button>
                </div>
            </div>

            <div className="bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-xl">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            <th className="px-8 py-6">Shop Name</th>
                            <th className="px-8 py-6">Location</th>
                            <th className="px-8 py-6">Category</th>
                            <th className="px-8 py-6">Plan</th>
                            <th className="px-8 py-6">Status</th>
                            <th className="px-8 py-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {shops.map((shop) => (
                            <tr key={shop.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-xl overflow-hidden border border-white/10">
                                            {shop.main_image_url ? <img src={shop.main_image_url} className="w-full h-full object-cover" /> : <ShopImagePlaceholder size="small" className="w-full h-full" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm">{shop.name}</span>
                                            {shop.phone && <span className="text-[9px] text-zinc-500 font-medium">{shop.phone}</span>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-xs text-zinc-400 font-bold">{shop.area || shop.location || 'N/A'}</td>
                                <td className="px-8 py-5 text-xs text-zinc-400 font-bold">{shop.category || 'Nightlife'}</td>
                                <td className="px-8 py-5">
                                    <span className="text-[10px] font-black px-3 py-1.5 rounded-lg bg-pink-600/10 text-pink-500 border border-pink-500/20 uppercase tracking-widest">
                                        {shop.plan?.name || 'Free'}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="text-[10px] font-black px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/10 uppercase">
                                        Active
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex justify-end gap-4">
                                        <Link 
                                            href={`/shopadmin/${shop.id}`}
                                            className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500 hover:bg-pink-500 hover:text-white transition-all group/icon"
                                            title="Manage Shop"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 20h9" />
                                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                            </svg>
                                        </Link>
                                        <button 
                                            onClick={() => handleEdit(shop)}
                                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white/10 hover:text-white transition-all"
                                            title="Edit Details"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {shops.length === 0 && (
                    <div className="p-20 text-center">
                        <p className="text-zinc-500 font-bold italic">No shops found.</p>
                    </div>
                )}
            </div>

            {/* Edit/Add Slide-over */}
            <SlideOver
                isOpen={!!editingShop || isAdding}
                onClose={() => { setEditingShop(null); setIsAdding(false); }}
                title={isAdding ? "Register New Shop" : "Edit Shop Details"}
                onSave={handleSave}
                isSaving={isSaving}
                saveLabel={isAdding ? "CREATE SHOP" : "SAVE CHANGES"}
            >
                <div className="space-y-8">
                    {/* Part 1: Shop Information */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-black text-pink-500 tracking-widest uppercase border-l-2 border-pink-500 pl-4">Shop Profile</h3>
                        
                        {/* Main Image Upload */}
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Shop Main Photo</label>
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-2xl bg-zinc-800 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group">
                                    {(isAdding ? newShop.main_image_url : editingShop?.main_image_url) ? (
                                        <img 
                                            key={isAdding ? newShop.main_image_url : editingShop?.main_image_url}
                                            src={isAdding ? newShop.main_image_url : editingShop?.main_image_url} 
                                            className={`w-full h-full object-cover transition-opacity ${isUploading ? 'opacity-40' : 'opacity-100'}`} 
                                            alt="Shop Preview"
                                        />
                                    ) : (
                                        <div className="text-zinc-600 text-[10px] font-black uppercase">No Image</div>
                                    )}

                                    {isUploading && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                            <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                    )}

                                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                                        <span className="text-[9px] font-black text-white uppercase tracking-tighter text-center px-1">
                                            {isUploading ? 'Wait...' : 'Choose'}
                                        </span>
                                        {!isUploading && <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />}
                                    </label>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] text-zinc-500 font-medium">Recommended: 1200x800px or larger.</p>
                                    <p className="text-[9px] text-zinc-500 font-medium">Wait for preview after selecting.</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Shop Name</label>
                            <input 
                                type="text" 
                                value={isAdding ? newShop.name : (editingShop?.name || '')} 
                                onChange={e => isAdding ? setNewShop({...newShop, name: e.target.value}) : setEditingShop({...editingShop, name: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50 transition-all placeholder:text-zinc-700"
                                placeholder="Enter establishment name..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Category</label>
                                <select 
                                    value={isAdding ? newShop.category : (editingShop?.category || '')} 
                                    onChange={e => isAdding ? setNewShop({...newShop, category: e.target.value}) : setEditingShop({...editingShop, category: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none appearance-none"
                                >
                                    <option value="Club">Club</option>
                                    <option value="KTV">KTV</option>
                                    <option value="Restaurant&Bar">Restaurant&Bar</option>
                                    <option value="SPA">SPA</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Area</label>
                                <input 
                                    type="text" 
                                    value={isAdding ? newShop.area : (editingShop?.area || '')} 
                                    onChange={e => isAdding ? setNewShop({...newShop, area: e.target.value}) : setEditingShop({...editingShop, area: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                                    placeholder="e.g. Sanchaung"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Phone</label>
                                <input 
                                    type="text" 
                                    value={isAdding ? newShop.phone : (editingShop?.phone || '')} 
                                    onChange={e => isAdding ? setNewShop({...newShop, phone: e.target.value}) : setEditingShop({...editingShop, phone: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                                    placeholder="09..."
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Closed (Holiday)</label>
                                <input 
                                    type="text" 
                                    value={isAdding ? newShop.holiday : (editingShop?.holiday || '')} 
                                    onChange={e => isAdding ? setNewShop({...newShop, holiday: e.target.value}) : setEditingShop({...editingShop, holiday: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                                    placeholder="e.g. Sunday"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Opening Hours</label>
                            <input 
                                type="text" 
                                value={isAdding ? newShop.opening_hours : (editingShop?.opening_hours || '')} 
                                onChange={e => isAdding ? setNewShop({...newShop, opening_hours: e.target.value}) : setEditingShop({...editingShop, opening_hours: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                                placeholder="e.g. 19:00 - 02:00"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Location (Region/City)</label>
                            <input 
                                type="text" 
                                value={isAdding ? newShop.location : (editingShop?.location || '')} 
                                onChange={e => isAdding ? setNewShop({...newShop, location: e.target.value}) : setEditingShop({...editingShop, location: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                                placeholder="e.g. Yangon"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Full Address (google map)</label>
                            <textarea 
                                rows={2}
                                value={isAdding ? newShop.address : (editingShop?.address || '')} 
                                onChange={e => isAdding ? setNewShop({...newShop, address: e.target.value}) : setEditingShop({...editingShop, address: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:border-pink-500/50"
                                placeholder="Full street address for google map..."
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Description</label>
                            <textarea 
                                rows={4}
                                value={isAdding ? newShop.description : (editingShop?.description || '')} 
                                onChange={e => isAdding ? setNewShop({...newShop, description: e.target.value}) : setEditingShop({...editingShop, description: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:border-pink-500/50"
                                placeholder="Tell us about the shop..."
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Subscription Plan</label>
                            <div className="grid grid-cols-2 gap-2">
                                {plans.map((plan) => (
                                    <button
                                        key={plan.id}
                                        onClick={() => {
                                            const planId = plan.id;
                                            if (isAdding) setNewShop({...newShop, plan_id: planId} as any);
                                            else setEditingShop({...editingShop, plan_id: planId});
                                        }}
                                        className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all text-left flex justify-between items-center ${
                                            (isAdding ? newShop.plan_id === plan.id : editingShop?.plan_id === plan.id)
                                            ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-900/20' 
                                            : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
                                        }`}
                                    >
                                        {plan.name}
                                        {(isAdding ? newShop.plan_id === plan.id : editingShop?.plan_id === plan.id) && <span>✓</span>}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-zinc-500 mt-2 italic">* Plans grant specific features and listing priorities.</p>
                        </div>
                    </div>

                    {/* Part 2: Shop Owner Account (Only for Addition) */}
                    {isAdding && (
                        <div className="space-y-6 pt-8 border-t border-white/5">
                            <h3 className="text-xs font-black text-pink-500 tracking-widest uppercase border-l-2 border-pink-500 pl-4">Account Information</h3>
                            
                            <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Owner Email</label>
                                <input 
                                    type="email" 
                                    value={newShop.owner_email} 
                                    onChange={e => setNewShop({...newShop, owner_email: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                                    placeholder="owner@example.com"
                                    required
                                />
                                <p className="text-[10px] text-zinc-500 mt-2 italic">* This user will be created with 'shop' role permissions.</p>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Owner Nickname</label>
                                <input 
                                    type="text" 
                                    value={newShop.owner_nickname} 
                                    onChange={e => setNewShop({...newShop, owner_nickname: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                                    placeholder="e.g. Manager John"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </SlideOver>
        </div>
    );
}

