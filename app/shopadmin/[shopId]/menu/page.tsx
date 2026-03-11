'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

export default function MenuManagement() {
    const { shopId } = useParams();
    const [menu, setMenu] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMenu = async () => {
            const { data } = await supabase.from('shop_menu_items').select('*').eq('shop_id', shopId).order('category', { ascending: true });
            setMenu(data || []);
            setLoading(false);
        };
        if (shopId) fetchMenu();
    }, [shopId]);

    const addItem = async () => {
        const name = prompt('Item name:');
        if (!name) return;
        const price = parseFloat(prompt('Price:') || '0');
        const category = prompt('Category (Drink, Food, Course):') || 'Food';
        
        const { error } = await supabase.from('shop_menu_items').insert([{ shop_id: shopId, name, price, category }]);
        if (error) alert(error.message);
        else {
            const { data } = await supabase.from('shop_menu_items').select('*').eq('shop_id', shopId).order('category', { ascending: true });
            setMenu(data || []);
        }
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tight">Digital Menu Management</h2>
                <button 
                    onClick={addItem}
                    className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-2xl text-[10px] font-black tracking-widest transition-all uppercase shadow-lg shadow-pink-900/20"
                >
                    + ADD ITEM
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menu.map((item) => (
                    <div key={item.id} className="bg-zinc-900 border border-white/5 overflow-hidden rounded-[2rem] group hover:border-pink-500/20 transition-all">
                        <div className="h-40 bg-zinc-800 flex items-center justify-center text-3xl">
                            {item.image_url ? <img src={item.image_url} className="w-full h-full object-cover" /> : '🍽️'}
                        </div>
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-black text-sm">{item.name}</h3>
                                <span className="text-pink-500 font-black text-xs">${item.price}</span>
                            </div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">{item.category}</p>
                            <div className="flex gap-2">
                                <button className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all">
                                    Edit
                                </button>
                                <button className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-xs">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {menu.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-zinc-900/20 rounded-3xl border border-dashed border-white/10">
                        <p className="text-zinc-500 font-bold italic">Menu is currently empty.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
