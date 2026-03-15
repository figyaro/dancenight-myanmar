'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';
import SlideOver from '../components/SlideOver';

const CATEGORIES = ['CLUB', 'KTV', 'RESTAURANT', 'BAR', 'SPA', 'Massage', 'others'];
const STATUSES = ['Prospect', 'Contacted', 'Negotiating', 'Won', 'Lost'];

const STATUS_COLORS: Record<string, string> = {
    'Prospect': 'bg-zinc-800 text-zinc-400 border-zinc-700',
    'Contacted': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Negotiating': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Won': 'bg-green-500/10 text-green-400 border-green-500/20',
    'Lost': 'bg-red-500/10 text-red-400 border-red-500/20'
};

export default function SalesManagement() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editingLead, setEditingLead] = useState<any>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const [newLead, setNewLead] = useState({
        name: '',
        category: 'CLUB',
        address: '',
        phone: '',
        website: '',
        status: 'Prospect',
        sales_rep_id: '',
        metadata: {}
    });

    const [isConverting, setIsConverting] = useState<any>(null); // lead to convert
    const [plans, setPlans] = useState<any[]>([]);
    const [salesReps, setSalesReps] = useState<any[]>([]);
    const [extractionMode, setExtractionMode] = useState(false);
    const [googleSearchQuery, setGoogleSearchQuery] = useState('');
    const [extractedResults, setExtractedResults] = useState<any[]>([]);

    const [conversionForm, setConversionForm] = useState({
        owner_email: '',
        owner_nickname: '',
        plan_id: ''
    });

    useEffect(() => {
        fetchLeads();
        fetchPlans();
        fetchSalesReps();
    }, []);

    const fetchPlans = async () => {
        const { data } = await supabase.from('plans').select('*').eq('type', 'shop');
        setPlans(data || []);
    };

    const fetchSalesReps = async () => {
        const { data } = await supabase.from('users').select('id, nickname').in('role', ['admin', 'super admin', 'admin sales']);
        setSalesReps(data || []);
    };

    const fetchLeads = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('sales_leads')
            .select(`
                *,
                sales_rep:users!sales_lead_sales_rep_id_fkey(nickname)
            `)
            .order('created_at', { ascending: false });
        
        if (error) console.error('Error fetching leads:', error);
        else setLeads(data || []);
        setLoading(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const leadData = isAdding ? newLead : editingLead;
        
        try {
            if (isAdding) {
                const { error } = await supabase.from('sales_leads').insert([leadData]);
                if (error) throw error;
                setIsAdding(false);
            } else {
                const { error } = await supabase
                    .from('sales_leads')
                    .update({
                        name: editingLead.name,
                        category: editingLead.category,
                        address: editingLead.address,
                        phone: editingLead.phone,
                        website: editingLead.website,
                        status: editingLead.status,
                        sales_rep_id: editingLead.sales_rep_id
                    })
                    .eq('id', editingLead.id);
                if (error) throw error;
                setEditingLead(null);
            }
            fetchLeads();
        } catch (err: any) {
            alert('Error saving lead: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleConversion = async () => {
        if (!isConverting || isSaving) return;
        setIsSaving(true);

        try {
            // 1. Create User
            const { data: userData, error: userError } = await supabase
                .from('users')
                .insert({
                    email: conversionForm.owner_email,
                    nickname: conversionForm.owner_nickname || isConverting.name + ' Owner',
                    role: 'shop'
                })
                .select()
                .single();

            if (userError) throw userError;

            // 2. Create Shop
            const { data: shopData, error: shopError } = await supabase
                .from('shops')
                .insert({
                    name: isConverting.name,
                    category: isConverting.category.toLowerCase(), // match shop categories
                    address: isConverting.address,
                    phone: isConverting.phone,
                    plan_id: conversionForm.plan_id
                })
                .select()
                .single();

            if (shopError) throw shopError;

            // 3. Link them
            await supabase.from('shop_members').insert({
                shop_id: shopData.id,
                user_id: userData.id,
                role: 'owner'
            });

            // 4. Update Lead with Shop ID
            await supabase.from('sales_leads').update({
                acquired_shop_id: shopData.id,
                status: 'Won'
            }).eq('id', isConverting.id);

            alert('Conversion Successful! Shop and User created.');
            setIsConverting(null);
            fetchLeads();
        } catch (err: any) {
            alert('Conversion failed: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const searchGoogleMaps = async () => {
        if (!googleSearchQuery) return;
        setLoading(true);

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            alert('Google Maps API Key not found in environment variables.');
            setLoading(false);
            return;
        }

        // 1. Load Google Maps Script if not exists
        if (typeof window !== 'undefined' && !(window as any).google) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
            
            // Wait for script to load
            await new Promise((resolve) => {
                script.onload = resolve;
            });
        }

        const google = (window as any).google;
        if (!google) {
            alert('Failed to load Google Maps SDK');
            setLoading(false);
            return;
        }

        // 2. Use PlacesService
        try {
            // Create a dummy div for PlacesService requirement
            const dummyDiv = document.createElement('div');
            const service = new google.maps.places.PlacesService(dummyDiv);

            service.textSearch({ query: googleSearchQuery }, (results: any[], status: any) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    const formattedResults = results.map(place => ({
                        name: place.name,
                        address: place.formatted_address,
                        phone: '', // Needs individual place details fetch for phone
                        category: (place.types?.[0] || 'others').toUpperCase(),
                        google_place_id: place.place_id,
                        rating: place.rating,
                        user_ratings_total: place.user_ratings_total
                    }));
                    setExtractedResults(formattedResults);
                } else {
                    alert('Search failed: ' + status);
                    setExtractedResults([]);
                }
                setLoading(false);
            });
        } catch (err: any) {
            alert('Extraction Error: ' + err.message);
            setLoading(false);
        }
    };

    const importLead = async (result: any) => {
        const { error } = await supabase.from('sales_leads').insert([{
            name: result.name,
            category: result.category,
            address: result.address,
            phone: result.phone,
            google_place_id: result.google_place_id,
            status: 'Prospect'
        }]);

        if (error) {
            if (error.code === '23505') alert('Lead already exists in database.');
            else alert('Error: ' + error.message);
        } else {
            alert('Imported successfully!');
            fetchLeads();
        }
    };

    const deleteLead = async (id: string) => {
        if (!confirm('Are you sure you want to delete this lead?')) return;
        const { error } = await supabase.from('sales_leads').delete().eq('id', id);
        if (error) alert('Error: ' + error.message);
        else fetchLeads();
    };

    const filteredLeads = leads.filter(l => {
        const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             l.address?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || l.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (loading && leads.length === 0) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Tab Navigation */}
            <div className="flex gap-8 border-b border-white/5 pb-px">
                <button 
                    onClick={() => setExtractionMode(false)}
                    className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${!extractionMode ? 'text-pink-500' : 'text-zinc-500 hover:text-white'}`}
                >
                    Lead Tracking
                    {!extractionMode && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]" />}
                </button>
                <button 
                    onClick={() => setExtractionMode(true)}
                    className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${extractionMode ? 'text-pink-500' : 'text-zinc-500 hover:text-white'}`}
                >
                    Extraction Tool
                    {extractionMode && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]" />}
                </button>
            </div>

            {!extractionMode ? (
                <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="relative flex-1 max-w-md">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">🔍</span>
                                <input 
                                    type="text" 
                                    placeholder="Search leads by name or address..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:border-pink-500/50 outline-none transition-all"
                                />
                            </div>
                            <select 
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="bg-zinc-900 border border-white/10 rounded-2xl py-3 px-6 text-xs font-black uppercase tracking-widest outline-none focus:border-pink-500/50 transition-all cursor-pointer"
                            >
                                <option value="all">Categories</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsAdding(true)}
                                className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-2xl text-[10px] font-black tracking-widest transition-all shadow-lg shadow-pink-900/20"
                            >
                                + NEW LEAD
                            </button>
                            <button 
                                onClick={fetchLeads}
                                className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-180 transition-transform duration-500">
                                    <path d="M23 4v6h-6" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div className="bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500 font-mono">
                                        <th className="px-8 py-6">Lead Entity</th>
                                        <th className="px-8 py-6">Category</th>
                                        <th className="px-8 py-6">Status</th>
                                        <th className="px-8 py-6">Sales Rep</th>
                                        <th className="px-8 py-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 font-bold">
                                    {filteredLeads.map((lead) => (
                                        <tr key={lead.id} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-white font-black">{lead.name}</span>
                                                    <span className="text-[10px] text-zinc-500 mt-1 truncate max-w-[200px]">{lead.address || 'No address'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-[10px] font-black px-2 py-1 rounded bg-zinc-800 text-zinc-400 border border-white/5 uppercase tracking-tighter">
                                                    {lead.category}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-md border tracking-tighter ${STATUS_COLORS[lead.status]}`}>
                                                    {lead.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-[10px] text-pink-500 font-black">
                                                        {lead.sales_rep?.nickname?.[0] || '?'}
                                                    </div>
                                                    <span className="text-xs text-zinc-400">{lead.sales_rep?.nickname || 'Unassigned'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {lead.status === 'Won' && !lead.acquired_shop_id && (
                                                        <button 
                                                            onClick={() => {
                                                                setIsConverting(lead);
                                                                setConversionForm({
                                                                    owner_email: '',
                                                                    owner_nickname: '',
                                                                    plan_id: plans[0]?.id || ''
                                                                });
                                                            }}
                                                            className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-[9px] font-black uppercase tracking-widest hover:bg-green-500/20"
                                                            title="Convert to Shop"
                                                        >
                                                            Acquire
                                                        </button>
                                                    )}
                                                    {lead.acquired_shop_id && (
                                                        <span className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-500 border border-white/5 text-[9px] font-black uppercase tracking-widest">
                                                            Acquired
                                                        </span>
                                                    )}
                                                    <button 
                                                        onClick={() => setEditingLead(lead)}
                                                        className="p-2 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5 transition-all"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => deleteLead(lead.id)}
                                                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 transition-all"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredLeads.length === 0 && (
                            <div className="p-20 text-center">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                    <span className="text-2xl text-zinc-700">📋</span>
                                </div>
                                <p className="text-zinc-500 font-bold italic">No prospecting leads found.</p>
                                <p className="text-xs text-zinc-600 mt-2">Start adding new leads or use the extraction tool.</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="space-y-8 max-w-4xl mx-auto">
                    <div className="p-10 bg-zinc-900 border border-white/10 rounded-[3rem] space-y-6 text-center shadow-2xl">
                        <div className="w-16 h-16 bg-pink-600/10 rounded-3xl flex items-center justify-center mx-auto border border-pink-500/20 mb-2">
                            <span className="text-2xl">📍</span>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black italic">Google Maps Extraction</h3>
                            <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Identify potential shops in specific areas</p>
                        </div>
                        
                        <div className="flex gap-4 max-w-xl mx-auto pt-4">
                            <input 
                                type="text"
                                placeholder="Area or Shop Name (e.g. Sanchaung KTV)"
                                value={googleSearchQuery}
                                onChange={(e) => setGoogleSearchQuery(e.target.value)}
                                className="flex-1 bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50 transition-all"
                            />
                            <button 
                                onClick={searchGoogleMaps}
                                disabled={loading}
                                className="px-8 py-4 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                {loading ? 'Searching...' : 'Search'}
                            </button>
                        </div>
                    </div>

                    {extractedResults.length > 0 && (
                        <div className="animate-in slide-in-from-bottom-4 duration-500">
                            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-4 text-center">Extracted Potential Shops</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {extractedResults.map((res, i) => (
                                    <div key={i} className="p-6 bg-zinc-900/40 border border-white/10 rounded-3xl flex items-center justify-between hover:border-pink-500/30 transition-all group">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-black text-white">{res.name}</span>
                                            <span className="text-[10px] text-zinc-500 truncate max-w-[200px]">{res.address}</span>
                                            <div className="flex gap-2 mt-1">
                                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">{res.category}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => importLead(res)}
                                            className="px-4 py-2 bg-white/5 hover:bg-pink-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5 opacity-0 group-hover:opacity-100"
                                        >
                                            Import
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* SlideOver for Add/Edit */}
            <SlideOver
                isOpen={isAdding || !!editingLead}
                onClose={() => { setIsAdding(false); setEditingLead(null); }}
                title={isAdding ? "New Prospect Lead" : "Edit Lead Details"}
                onSave={handleSave}
                isSaving={isSaving}
                saveLabel={isAdding ? "CREATE LEAD" : "SAVE CHANGES"}
            >
                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Lead Name / Shop Name</label>
                        <input 
                            type="text" 
                            value={isAdding ? newLead.name : editingLead?.name || ''} 
                            onChange={e => isAdding ? setNewLead({...newLead, name: e.target.value}) : setEditingLead({...editingLead, name: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                            placeholder="e.g. Club Red Diamond"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Category</label>
                            <select 
                                value={isAdding ? newLead.category : editingLead?.category || 'CLUB'} 
                                onChange={e => isAdding ? setNewLead({...newLead, category: e.target.value}) : setEditingLead({...editingLead, category: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Current Status</label>
                            <select 
                                value={isAdding ? newLead.status : editingLead?.status || 'Prospect'} 
                                onChange={e => isAdding ? setNewLead({...newLead, status: e.target.value}) : setEditingLead({...editingLead, status: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none"
                            >
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Assigned Sales Rep</label>
                        <select 
                            value={isAdding ? newLead.sales_rep_id : editingLead?.sales_rep_id || ''} 
                            onChange={e => isAdding ? setNewLead({...newLead, sales_rep_id: e.target.value}) : setEditingLead({...editingLead, sales_rep_id: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                        >
                            <option value="">Unassigned</option>
                            {salesReps.map(rep => (
                                <option key={rep.id} value={rep.id}>{rep.nickname}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Full Address</label>
                        <textarea 
                            rows={2}
                            value={isAdding ? newLead.address : editingLead?.address || ''} 
                            onChange={e => isAdding ? setNewLead({...newLead, address: e.target.value}) : setEditingLead({...editingLead, address: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-medium outline-none focus:border-pink-500/50"
                            placeholder="Street, City, Area..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Phone Number</label>
                            <input 
                                type="text" 
                                value={isAdding ? newLead.phone : editingLead?.phone || ''} 
                                onChange={e => isAdding ? setNewLead({...newLead, phone: e.target.value}) : setEditingLead({...editingLead, phone: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                                placeholder="09..."
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Website / FB URL</label>
                            <input 
                                type="text" 
                                value={isAdding ? newLead.website : editingLead?.website || ''} 
                                onChange={e => isAdding ? setNewLead({...newLead, website: e.target.value}) : setEditingLead({...editingLead, website: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </div>
            </SlideOver>

            {/* Conversion Modal */}
            {isConverting && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsConverting(null)} />
                    <div className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 space-y-8">
                            <div>
                                <h3 className="text-2xl font-black text-white italic">Convert to Shop</h3>
                                <p className="text-xs text-zinc-500 font-bold mt-1 uppercase tracking-widest">Onboarding: {isConverting.name}</p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Owner Email</label>
                                    <input 
                                        type="email"
                                        placeholder="owner@example.com"
                                        value={conversionForm.owner_email}
                                        onChange={e => setConversionForm({...conversionForm, owner_email: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Owner Nickname (Optional)</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Manager Mike"
                                        value={conversionForm.owner_nickname}
                                        onChange={e => setConversionForm({...conversionForm, owner_nickname: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-pink-500/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Target Subscription Plan</label>
                                    <select 
                                        value={conversionForm.plan_id}
                                        onChange={e => setConversionForm({...conversionForm, plan_id: e.target.value})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none"
                                    >
                                        <option value="">Select a plan</option>
                                        {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    onClick={() => setIsConverting(null)}
                                    className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleConversion}
                                    disabled={isSaving || !conversionForm.owner_email || !conversionForm.plan_id}
                                    className="flex-[2] py-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-green-900/20 transition-all"
                                >
                                    {isSaving ? 'CONVERTING...' : 'FINALIZE & ACQUIRE'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
