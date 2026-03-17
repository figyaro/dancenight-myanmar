'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

type Tab = 'overview' | 'transactions' | 'wallets' | 'campaigns';

export default function DtipManagement() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalCirculation: 0,
        totalTransactions: 0,
        totalPurchased: 0,
        totalTipped: 0
    });
    const [transactions, setTransactions] = useState<any[]>([]);
    const [wallets, setWallets] = useState<any[]>([]);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
    const [newCampaign, setNewCampaign] = useState({
        title: '',
        description: '',
        type: 'bulk_gift',
        requirement_type: 'manual',
        requirement_value: 0,
        reward_amount: 0,
        target_role: 'user'
    });

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'overview') {
                const { data: wData } = await supabase.from('wallets').select('balance');
                const { data: tData } = await supabase.from('dtip_transactions').select('amount, type');
                
                const circulation = (wData || []).reduce((acc: number, curr: any) => acc + curr.balance, 0);
                const purchased = (tData || []).filter((t: any) => t.type === 'purchase').reduce((acc: number, curr: any) => acc + curr.amount, 0);
                const tipped = (tData || []).filter((t: any) => t.type === 'tip').reduce((acc: number, curr: any) => acc + curr.amount, 0);

                setStats({
                    totalCirculation: circulation,
                    totalTransactions: (tData || []).length,
                    totalPurchased: purchased,
                    totalTipped: tipped
                });
            } else if (activeTab === 'transactions') {
                const { data } = await supabase
                    .from('dtip_transactions')
                    .select('*, sender:sender_id(nickname), receiver:receiver_id(nickname)')
                    .order('created_at', { ascending: false })
                    .limit(50);
                setTransactions(data || []);
            } else if (activeTab === 'wallets') {
                const { data } = await supabase
                    .from('wallets')
                    .select('*, user:user_id(nickname, email, role)')
                    .order('balance', { ascending: false })
                    .limit(50);
                setWallets(data || []);
            } else if (activeTab === 'campaigns') {
                const { data } = await supabase
                    .from('dtip_campaigns')
                    .select('*')
                    .order('created_at', { ascending: false });
                setCampaigns(data || []);
            }
        } catch (err) {
            console.error('Error fetching dtip data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleManualAdjust = async (userId: string, currentBalance: number) => {
        const amountStr = prompt('Enter amount to add (positive) or subtract (negative):');
        if (!amountStr) return;
        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount === 0) return;

        if (currentBalance + amount < 0) {
            alert('Operation would result in negative balance.');
            return;
        }

        const { data: success, error } = await supabase.rpc('process_dtip_transaction', {
            p_sender_id: amount < 0 ? userId : null,
            p_receiver_id: amount > 0 ? userId : null,
            p_amount: Math.abs(amount),
            p_transaction_type: amount > 0 ? 'purchase' : 'withdrawal',
            p_reference_type: 'admin_adjustment',
            p_metadata: { adjusted_by: 'admin' }
        });

        if (error || !success) {
            alert('Adjustment failed: ' + (error?.message || 'Unknown error'));
        } else {
            fetchData();
        }
    };

    const handleCreateCampaign = async () => {
        if (!newCampaign.title || newCampaign.reward_amount <= 0) {
            alert('Please fill in title and reward amount.');
            return;
        }

        const { error } = await supabase
            .from('dtip_campaigns')
            .insert([newCampaign]);

        if (error) {
            alert('Failed to create campaign: ' + error.message);
        } else {
            setIsCampaignModalOpen(false);
            fetchData();
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
                    {(['overview', 'transactions', 'wallets', 'campaigns'] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                activeTab === tab 
                                ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/40' 
                                : 'bg-white/5 text-zinc-500 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={fetchData}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        title="Refresh Data"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64 text-zinc-500 font-black animate-pulse uppercase tracking-[0.2em]">
                    Synchronizing Ledger...
                </div>
            ) : (
                <>
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Total Circulation', value: stats.totalCirculation, icon: '🪙', color: 'from-amber-500/20 to-orange-500/20' },
                                { label: 'Transaction Count', value: stats.totalTransactions, icon: '📊', color: 'from-blue-500/20 to-cyan-500/20' },
                                { label: 'Purchased Volume', value: stats.totalPurchased, icon: '💳', color: 'from-emerald-500/20 to-teal-500/20' },
                                { label: 'Tipped Volume', value: stats.totalTipped, icon: '💝', color: 'from-pink-500/20 to-rose-500/20' },
                            ].map((card, i) => (
                                <div key={i} className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-xl group hover:border-white/10 transition-all duration-500">
                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${card.color} flex items-center justify-center text-2xl mb-4`}>
                                        {card.icon}
                                    </div>
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">{card.label}</p>
                                    <p className="text-3xl font-black">{card.value.toLocaleString()} <span className="text-xs text-zinc-600">dtip</span></p>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'transactions' && (
                        <div className="bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-xl animate-in slide-in-from-right-4 duration-500">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Type</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Sender</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Receiver</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Amount</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-tighter ${
                                                    tx.type === 'purchase' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    tx.type === 'tip' ? 'bg-pink-500/20 text-pink-400' :
                                                    'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-zinc-400">{tx.sender?.nickname || 'SYSTEM'}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-zinc-400">{tx.receiver?.nickname || 'SYSTEM'}</td>
                                            <td className="px-6 py-4 text-sm font-black text-white">{tx.amount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-[10px] font-bold text-zinc-500">{new Date(tx.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'wallets' && (
                        <div className="bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-xl animate-in slide-in-from-right-4 duration-500">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">User</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Role</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Balance</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wallets.map((w) => (
                                        <tr key={w.user_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-white">{w.user?.nickname}</span>
                                                    <span className="text-[10px] text-zinc-500 font-bold">{w.user?.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-black text-pink-500 uppercase">{w.user?.role}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-black text-white">{w.balance.toLocaleString()} dtip</td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleManualAdjust(w.user_id, w.balance)}
                                                    className="px-3 py-1.5 rounded-lg bg-pink-600/10 border border-pink-500/20 text-[10px] font-black text-pink-500 uppercase tracking-widest hover:bg-pink-600 hover:text-white transition-all"
                                                >
                                                    Adjust
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'campaigns' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Create New Campaign Card */}
                                <button 
                                    onClick={() => setIsCampaignModalOpen(true)}
                                    className="bg-zinc-900/40 p-8 rounded-3xl border border-white/5 border-dashed hover:border-pink-500/50 hover:bg-pink-500/5 transition-all group flex flex-col items-center justify-center text-center"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">➕</div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-pink-500 transition-colors">New Campaign</p>
                                </button>

                                {campaigns.map((c) => (
                                    <div key={c.id} className="bg-zinc-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-xl relative overflow-hidden group">
                                        <div className={`absolute top-0 right-0 px-4 py-1 text-[10px] font-black uppercase tracking-tighter ${
                                            c.status === 'active' ? 'bg-emerald-500 text-black' :
                                            c.status === 'draft' ? 'bg-zinc-700 text-white' : 'bg-pink-600 text-white'
                                        }`}>
                                            {c.status}
                                        </div>
                                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">{c.type}</p>
                                        <h4 className="text-xl font-black mb-2 text-white">{c.title}</h4>
                                        <p className="text-xs text-zinc-500 mb-6 line-clamp-2">{c.description}</p>
                                        
                                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-zinc-500 font-black uppercase">Reward</span>
                                                <span className="text-lg font-black text-white">{c.reward_amount.toLocaleString()} <span className="text-xs">dtip</span></span>
                                            </div>
                                            <button className="px-4 py-2 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Details</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Campaign Modal */}
            {isCampaignModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsCampaignModalOpen(false)} />
                    <div className="relative w-full max-w-lg bg-zinc-900 p-8 rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300">
                        <h3 className="text-xl font-black mb-6 uppercase tracking-widest">Create Campaign</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Campaign Title</label>
                                <input 
                                    type="text" 
                                    value={newCampaign.title}
                                    onChange={(e) => setNewCampaign({...newCampaign, title: e.target.value})}
                                    placeholder="e.g., Welcome Quest" 
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Type</label>
                                    <select 
                                        value={newCampaign.type}
                                        onChange={(e: any) => setNewCampaign({...newCampaign, type: e.target.value, requirement_type: e.target.value === 'quest' ? 'post_count' : 'manual'})}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500"
                                    >
                                        <option value="bulk_gift" className="bg-zinc-900">Bulk Gift</option>
                                        <option value="quest" className="bg-zinc-900">Quest (Auto)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Reward (dtip)</label>
                                    <input 
                                        type="number" 
                                        value={newCampaign.reward_amount}
                                        onChange={(e) => setNewCampaign({...newCampaign, reward_amount: parseInt(e.target.value)})}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500"
                                    />
                                </div>
                            </div>

                            {newCampaign.type === 'quest' && (
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Post Goal</label>
                                    <input 
                                        type="number" 
                                        value={newCampaign.requirement_value}
                                        onChange={(e) => setNewCampaign({...newCampaign, requirement_value: parseInt(e.target.value)})}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Description</label>
                                <textarea 
                                    value={newCampaign.description}
                                    onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    onClick={() => setIsCampaignModalOpen(false)}
                                    className="flex-1 py-4 rounded-2xl bg-white/5 font-black text-[10px] uppercase tracking-widest hover:bg-white/10"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleCreateCampaign}
                                    className="flex-1 py-4 rounded-2xl bg-pink-600 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-pink-900/20"
                                >
                                    Create Campaign
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
