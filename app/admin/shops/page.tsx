'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';
import SlideOver from '../components/SlideOver';
import ShopImagePlaceholder from '../../components/ShopImagePlaceholder';

export default function ShopManagement() {
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // UI state
    const [editingShop, setEditingShop] = useState<any>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form state for new shop/user
    const [newShop, setNewShop] = useState({
        name: '',
        category: 'Club',
        area: '',
        location: '',
        address: '',
        description: '',
        owner_email: '',
        owner_nickname: ''
    });

    useEffect(() => {
        fetchShops();
    }, []);

    const fetchShops = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('shops')
            .select('*')
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
            owner_nickname: ''
        });
        setIsAdding(true);
        setEditingShop(null);
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

            // 2. Create Shop
            const { data: shopData, error: shopError } = await supabase
                .from('shops')
                .insert({
                    name: newShop.name,
                    category: newShop.category,
                    area: newShop.area,
                    location: newShop.location,
                    address: newShop.address,
                    description: newShop.description
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
                    address: editingShop.address
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
                                        <span className="font-bold text-sm">{shop.name}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-xs text-zinc-400 font-bold">{shop.area || shop.location || 'N/A'}</td>
                                <td className="px-8 py-5 text-xs text-zinc-400 font-bold">{shop.category || 'Nightlife'}</td>
                                <td className="px-8 py-5">
                                    <span className="text-[10px] font-black px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/10 uppercase">
                                        Active
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex justify-end gap-3">
                                        <Link 
                                            href={`/shopadmin/${shop.id}`}
                                            className="text-[10px] font-black tracking-widest text-pink-500 hover:text-pink-400 transition-colors uppercase"
                                        >
                                            Manage
                                        </Link>
                                        <button 
                                            onClick={() => handleEdit(shop)}
                                            className="text-[10px] font-black tracking-widest text-zinc-500 hover:text-white transition-colors uppercase"
                                        >
                                            Edit
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
                                    <option value="Restaurant">Restaurant</option>
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
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Full Address</label>
                            <textarea 
                                rows={2}
                                value={isAdding ? newShop.address : (editingShop?.address || '')} 
                                onChange={e => isAdding ? setNewShop({...newShop, address: e.target.value}) : setEditingShop({...editingShop, address: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:border-pink-500/50"
                                placeholder="Full street address..."
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
