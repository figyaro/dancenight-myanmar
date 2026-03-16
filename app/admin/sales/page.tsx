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
    const [pagination, setPagination] = useState<any>(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

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
        console.log('--- FETCH LEADS START ---');
        
        try {
            // 1. Fetch sales reps separately
            const { data: repsData, error: repsError } = await supabase
                .from('users')
                .select('id, nickname, email')
                .in('role', ['admin', 'super admin', 'admin sales']);
            
            if (repsError) {
                console.error('Error fetching sales reps:', repsError);
            } else {
                setSalesReps(repsData || []);
            }

            // 2. Fetch leads with fallback for join
            let { data, error } = await supabase
                .from('sales_leads')
                .select('*, sales_rep:users(nickname)')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.warn('Join fetch failed, falling back:', error);
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('sales_leads')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (fallbackError) throw fallbackError;
                setLeads(fallbackData || []);
            } else {
                setLeads(data || []);
            }
        } catch (err: any) {
            console.error('Global Fetch Error:', err);
            alert('Error loading data: ' + err.message);
        } finally {
            setLoading(false);
            console.log('--- FETCH LEADS END ---');
        }
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

    const fetchAndFormatDetails = async (places: any[], paginationObj: any) => {
        const google = (window as any).google;
        const dummyDiv = document.createElement('div');
        const service = new google.maps.places.PlacesService(dummyDiv);

        // Get existing place IDs to exclude duplicates
        const existingPlaceIds = new Set(leads.map(l => l.google_place_id).filter(Boolean));

        const newDetailedResults = await Promise.all(
            places.map(async (place) => {
                // Deduplication
                if (existingPlaceIds.has(place.place_id)) return null;

                return new Promise((resolve) => {
                    service.getDetails({ 
                        placeId: place.place_id,
                        fields: ['name', 'formatted_address', 'formatted_phone_number', 'website', 'photos', 'types', 'place_id', 'rating']
                    }, (details: any, dStatus: any) => {
                        if (dStatus === google.maps.places.PlacesServiceStatus.OK && details) {
                            let cat = 'others';
                            const t = details.types || [];
                            if (t.includes('night_club') || t.includes('bar')) cat = 'CLUB';
                            else if (t.includes('ktv')) cat = 'KTV';
                            else if (t.includes('spa')) cat = 'SPA';
                            else if (t.includes('massage')) cat = 'Massage';
                            else if (t.includes('restaurant')) cat = 'RESTAURANT';

                            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
                            const photoReference = details.photos?.[0]?.photo_reference;
                            const photoUrl = photoReference 
                                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${apiKey}`
                                : null;

                            resolve({
                                name: details.name,
                                address: details.formatted_address,
                                phone: details.formatted_phone_number || '',
                                website: details.website || '',
                                category: cat,
                                google_place_id: details.place_id,
                                rating: details.rating,
                                photo_url: photoUrl
                            });
                        } else {
                            resolve(null); // Skip if details fail
                        }
                    });
                });
            })
        );

        const filtered = newDetailedResults.filter(Boolean);
        setExtractedResults(prev => paginationObj?.hasNextPage ? [...prev, ...filtered] : filtered);
        setPagination(paginationObj);
        setIsLoadingMore(false);
        setLoading(false);
    };

    const searchGoogleMaps = async () => {
        if (!googleSearchQuery) return;
        setLoading(true);
        setExtractedResults([]);

        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            alert('Google Maps API Key not found.');
            setLoading(false);
            return;
        }

        if (typeof window !== 'undefined' && !(window as any).google) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            document.head.appendChild(script);
            await new Promise((resolve) => script.onload = resolve);
        }

        const google = (window as any).google;
        const dummyDiv = document.createElement('div');
        const service = new google.maps.places.PlacesService(dummyDiv);

        service.textSearch({ query: googleSearchQuery }, (results: any[], status: any, paginationObj: any) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                fetchAndFormatDetails(results, paginationObj);
            } else {
                alert('Search failed: ' + status);
                setLoading(false);
            }
        });
    };

    const loadMoreResults = () => {
        if (pagination && pagination.hasNextPage) {
            setIsLoadingMore(true);
            pagination.nextPage();
        }
    };

    const importLead = async (result: any) => {
        console.log('Importing Lead:', result.name);
        const { error } = await supabase.from('sales_leads').insert([{
            name: result.name,
            category: result.category,
            address: result.address,
            phone: result.phone || '',
            website: result.website || '',
            google_place_id: result.google_place_id,
            status: 'Prospect',
            metadata: { 
                photo_url: result.photo_url,
                imported_at: new Date().toISOString()
            }
        }]);

        if (error) {
            console.error('Import Error:', error);
            if (error.code === '23505') alert('This lead is already in your database.');
            else alert('Import Error: ' + error.message);
        } else {
            alert('Success! Imported ' + result.name);
            // Remove from extracted results immediately
            setExtractedResults(prev => prev.filter(r => r.google_place_id !== result.google_place_id));
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
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-black flex-shrink-0 overflow-hidden border border-white/5">
                                                        {lead.metadata?.photo_url ? (
                                                            <img src={lead.metadata.photo_url} alt={lead.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-zinc-900">
                                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm text-white font-black truncate">{lead.name}</span>
                                                        <span className="text-[10px] text-zinc-500 mt-1 truncate max-w-[250px]">{lead.address || 'No address'}</span>
                                                        
                                                        <div className="flex gap-3 mt-2">
                                                            {lead.phone && (
                                                                <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400">
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.88 12.88 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                                                    {lead.phone}
                                                                </div>
                                                            )}
                                                            {lead.website && (
                                                                <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] font-bold text-blue-400 hover:text-blue-300">
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                                                    Website
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
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
                        <div className="animate-in slide-in-from-bottom-4 duration-500 pb-12">
                            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-6 text-center">Extracted Potential Shops</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {extractedResults.map((res, i) => (
                                    <div key={i} className="p-4 bg-zinc-900/40 border border-white/10 rounded-[2rem] flex items-center gap-4 hover:border-pink-500/30 transition-all group overflow-hidden">
                                        {/* Photo Thumbnail */}
                                        <div className="w-20 h-20 rounded-2xl bg-black flex-shrink-0 overflow-hidden border border-white/5">
                                            {res.photo_url ? (
                                                <img src={res.photo_url} alt={res.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 flex flex-col min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-sm font-black text-white truncate">{res.name}</span>
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500 border border-pink-500/20">{res.category}</span>
                                            </div>
                                            <p className="text-[10px] text-zinc-500 truncate mb-2">{res.address}</p>
                                            
                                            <div className="flex items-center gap-3">
                                                {res.phone && (
                                                    <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-400">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.88 12.88 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                                                        {res.phone}
                                                    </div>
                                                )}
                                                {res.website && (
                                                    <a href={res.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[9px] font-bold text-blue-400 hover:text-blue-300">
                                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                                                        Website
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => importLead(res)}
                                            className="p-3 bg-white/5 hover:bg-pink-600 hover:text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-white/5"
                                            title="Import as Lead"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {pagination && pagination.hasNextPage && (
                                <div className="mt-12 text-center">
                                    <button 
                                        onClick={loadMoreResults}
                                        disabled={isLoadingMore}
                                        className="px-12 py-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center gap-3 mx-auto"
                                    >
                                        {isLoadingMore ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                Loading More...
                                            </>
                                        ) : (
                                            <>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
                                                Load More Results
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
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
