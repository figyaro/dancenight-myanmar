'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

interface Customer {
    id: string;
    user_id: string;
    last_visit: string;
    total_visits: number;
    notes: string;
    user: {
        nickname: string;
        email: string;
        avatar_url: string;
        role: string;
        phone: string;
    }
}

export default function ShopCustomers() {
    const { shopId } = useParams();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (shopId) fetchCustomers();
    }, [shopId]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('shop_customers')
                .select(`
                    *,
                    user:users!user_id (
                        nickname,
                        email,
                        avatar_url,
                        role,
                        phone
                    )
                `)
                .eq('shop_id', shopId)
                .order('last_visit', { ascending: false });

            if (error) throw error;
            setCustomers(data || []);
        } catch (err: any) {
            console.error('Error fetching customers:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateNotes = async (id: string, notes: string) => {
        try {
            const { error } = await supabase
                .from('shop_customers')
                .update({ notes })
                .eq('id', id);
            
            if (error) throw error;
            setCustomers(prev => prev.map(c => c.id === id ? { ...c, notes } : c));
        } catch (err: any) {
            alert('Error updating notes: ' + err.message);
        }
    };

    const filteredCustomers = customers.filter(c => 
        c.user?.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center text-white">
                <div>
                    <h2 className="text-3xl font-black tracking-tighter">User Management</h2>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Manage your shop customers and visit history</p>
                </div>
                
                <div className="relative w-72">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
                    <input 
                        type="text" 
                        placeholder="Search by nickname..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs font-bold focus:border-pink-500/50 transition-all outline-none"
                    />
                </div>
            </div>

            <div className="bg-zinc-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/5 bg-white/5 text-white">
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Guest</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Phone</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Visits</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Last Visit</th>
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Internal Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm text-white">
                        {filteredCustomers.map((customer) => (
                            <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 overflow-hidden flex items-center justify-center">
                                            {customer.user?.avatar_url ? (
                                                <img src={customer.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs font-black">{(customer.user?.nickname || 'U').charAt(0)}</span>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white group-hover:text-pink-500 transition-colors uppercase tracking-tight">{customer.user?.nickname || 'Anonymous'}</p>
                                            <p className="text-[10px] font-bold text-zinc-500 tracking-widest">{customer.user?.role?.toUpperCase()}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <p className="font-bold text-zinc-300 tracking-tight">{customer.user?.phone || '---'}</p>
                                </td>
                                <td className="px-8 py-6">
                                    <span className="px-3 py-1.5 bg-zinc-800 rounded-lg text-xs font-black border border-white/5">
                                        {customer.total_visits} <span className="text-[8px] text-zinc-500 uppercase tracking-widest ml-1">Times</span>
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <p className="font-bold text-zinc-200">{new Date(customer.last_visit).toLocaleDateString()}</p>
                                    <p className="text-[10px] font-black text-zinc-500 tracking-widest uppercase">
                                        {new Date(customer.last_visit).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </td>
                                <td className="px-8 py-6">
                                    <input 
                                        type="text"
                                        placeholder="Add private note..."
                                        defaultValue={customer.notes}
                                        onBlur={(e) => updateNotes(customer.id, e.target.value)}
                                        className="w-full bg-transparent border-b border-transparent hover:border-white/10 focus:border-pink-500/50 outline-none py-1 text-xs text-zinc-400 focus:text-white transition-all"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredCustomers.length === 0 && (
                    <div className="py-20 text-center">
                        <p className="text-zinc-500 font-bold italic">No customers found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
