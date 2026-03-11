'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';

interface Plan {
    id: string;
    name: string;
    type: string;
    tier: string;
    price_monthly: number;
    price_yearly: number;
    price_custom: number;
    features: string[];
}

export default function PlanManagement() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('plans')
            .select('*')
            .order('type', { ascending: true });
        
        if (error) console.error('Error fetching plans:', error);
        else setPlans(data || []);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!editingPlan?.name || !editingPlan?.type) return;

        setLoading(true);
        const { error } = editingPlan.id 
            ? await supabase.from('plans').update(editingPlan).eq('id', editingPlan.id)
            : await supabase.from('plans').insert([editingPlan]);

        if (error) {
            alert('Error saving plan: ' + error.message);
        } else {
            setShowModal(false);
            setEditingPlan(null);
            fetchPlans();
        }
    };

    const deletePlan = async (id: string) => {
        if (!confirm('Are you sure you want to delete this plan?')) return;
        const { error } = await supabase.from('plans').delete().eq('id', id);
        if (error) alert('Error deleting plan: ' + error.message);
        else fetchPlans();
    };

    if (loading && plans.length === 0) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black tracking-tight">Plan & Packages</h2>
                    <p className="text-zinc-500 text-sm font-medium">Manage subscription tiers for users, dancers, and shops.</p>
                </div>
                <button 
                    onClick={() => { setEditingPlan({ type: 'user', tier: 'Pro', features: [] }); setShowModal(true); }}
                    className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-2xl text-[10px] font-black tracking-widest transition-all shadow-lg shadow-pink-900/20"
                >
                    + NEW PLAN
                </button>
            </div>

            {/* Plan Groups */}
            <div className="space-y-12">
                {['user', 'dancer', 'shop'].map((type) => (
                    <section key={type} className="space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-4">
                            {type} Plans
                            <div className="h-px bg-white/5 flex-1" />
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {plans.filter(p => p.type === type).map((plan) => (
                                <div key={plan.id} className="bg-zinc-900/40 rounded-3xl border border-white/5 p-6 backdrop-blur-xl group hover:border-pink-500/20 transition-all flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-xl">
                                            {type === 'user' ? '👤' : type === 'dancer' ? '💃' : '🏢'}
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => { setEditingPlan(plan); setShowModal(true); }} className="p-2 hover:text-pink-500 transition-colors">✏️</button>
                                            <button onClick={() => deletePlan(plan.id)} className="p-2 hover:text-red-500 transition-colors">🗑️</button>
                                        </div>
                                    </div>
                                    
                                    <h4 className="font-black text-lg mb-1">{plan.name}</h4>
                                    <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-6">Tier: {plan.tier}</p>

                                    <div className="space-y-3 mb-8 flex-1">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-zinc-500 uppercase tracking-tighter">Monthly</span>
                                            <span className="text-zinc-200">${plan.price_monthly || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-zinc-500 uppercase tracking-tighter">Yearly</span>
                                            <span className="text-zinc-200">${plan.price_yearly || 0}</span>
                                        </div>
                                        {plan.price_custom > 0 && (
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-zinc-500 uppercase tracking-tighter">Custom</span>
                                                <span className="text-zinc-200">${plan.price_custom}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-4 border-t border-white/5">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Features</p>
                                        <div className="flex flex-wrap gap-2">
                                            {(plan.features || []).map((f, i) => (
                                                <span key={i} className="text-[9px] font-bold px-2 py-1 rounded-md bg-white/5 text-zinc-400 border border-white/5">
                                                    {f}
                                                </span>
                                            ))}
                                            {(plan.features || []).length === 0 && <span className="text-[9px] italic text-zinc-600">No special features</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <h3 className="text-xl font-black mb-6">{editingPlan?.id ? 'Edit Plan' : 'New Plan'}</h3>
                        
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Plan Name</label>
                                    <input 
                                        type="text" 
                                        value={editingPlan?.name || ''} 
                                        onChange={e => setEditingPlan({...editingPlan, name: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-pink-500/50"
                                        placeholder="e.g. User Pro"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Tier Name</label>
                                    <input 
                                        type="text" 
                                        value={editingPlan?.tier || ''} 
                                        onChange={e => setEditingPlan({...editingPlan, tier: e.target.value})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-pink-500/50"
                                        placeholder="e.g. Pro, Gold, KTV"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Target Type</label>
                                <select 
                                    value={editingPlan?.type || 'user'} 
                                    onChange={e => setEditingPlan({...editingPlan, type: e.target.value})}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-pink-500/50 appearance-none"
                                >
                                    <option value="user">User</option>
                                    <option value="dancer">Dancer</option>
                                    <option value="shop">Shop</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Monthly ($)</label>
                                    <input 
                                        type="number" 
                                        value={editingPlan?.price_monthly || 0} 
                                        onChange={e => setEditingPlan({...editingPlan, price_monthly: Number(e.target.value)})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-pink-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Yearly ($)</label>
                                    <input 
                                        type="number" 
                                        value={editingPlan?.price_yearly || 0} 
                                        onChange={e => setEditingPlan({...editingPlan, price_yearly: Number(e.target.value)})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-pink-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Custom ($)</label>
                                    <input 
                                        type="number" 
                                        value={editingPlan?.price_custom || 0} 
                                        onChange={e => setEditingPlan({...editingPlan, price_custom: Number(e.target.value)})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:border-pink-500/50"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-4">
                            <button 
                                onClick={() => setShowModal(false)}
                                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-[10px] font-black tracking-widest transition-all uppercase"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                className="flex-1 py-4 bg-pink-600 hover:bg-pink-500 rounded-2xl text-[10px] font-black tracking-widest transition-all uppercase shadow-lg shadow-pink-900/20"
                            >
                                Save Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
