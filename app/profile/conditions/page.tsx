'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { getEffectiveUserId } from '../../../lib/auth-util';
import TopNav from '../../components/TopNav';
import BottomNav from '../../components/BottomNav';

const PREDEFINED_TAGS = [
    'Clubbing', 'Drinking OK', 'Until Morning', 'Curfew OK', 'Keep Promises', 'Just Wanna Dance',
    'Vibe Focused', 'Beginners Welcome', 'Pro-Oriented', 'High Tension', 'Low Tolerance', 'I am Shy',
    'HIPHOP Spec', 'K-POP Cover', 'Freestyle OK', 'Tutor Experience'
];

export default function DancerConditions() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [dancerId, setDancerId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    const [availability, setAvailability] = useState('');
    const [price, setPrice] = useState('');
    const [place, setPlace] = useState('');
    const [comment, setComment] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [customTag, setCustomTag] = useState('');

    useEffect(() => {
        const fetchDancerData = async () => {
            const effectiveUserId = await getEffectiveUserId();
            if (!effectiveUserId) {
                router.push('/login');
                return;
            }
            setUserId(effectiveUserId);

            // Get user profile to check role
            const { data: uData } = await supabase.from('users').select('*').eq('id', effectiveUserId).single();
            if (uData?.role !== 'dancer') {
                router.push('/profile');
                return;
            }
            setProfile(uData);

            // Get or create dancer record
            const { data: dData, error } = await supabase
                .from('dancers')
                .select('*')
                .eq('user_id', effectiveUserId)
                .single();

            if (dData) {
                setDancerId(dData.id);
                setAvailability(dData.availability_info || '');
                setPrice(dData.price_info || '');
                setPlace(dData.place_info || '');
                setComment(dData.comment || '');
                setSelectedTags(dData.condition_tags || []);
            } else {
                // Create if not exists (should have been created at sign up/role change)
                const { data: newData } = await supabase
                    .from('dancers')
                    .insert([{ user_id: effectiveUserId, name: uData.nickname || uData.name || 'Dancer' }])
                    .select()
                    .single();
                if (newData) setDancerId(newData.id);
            }
            setLoading(false);
        };

        fetchDancerData();
    }, [router]);

    const handleSave = async () => {
        if (!dancerId || saving) return;
        setSaving(true);

        const { error } = await supabase
            .from('dancers')
            .update({
                availability_info: availability,
                price_info: price,
                place_info: place,
                comment: comment,
                condition_tags: selectedTags
            })
            .eq('id', dancerId);

        if (error) {
            console.error('Error saving conditions:', error);
            alert('Save failed: ' + error.message);
        } else {
            router.push('/profile');
        }
        setSaving(false);
    };

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const addCustomTag = () => {
        if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
            setSelectedTags(prev => [...prev, customTag.trim()]);
            setCustomTag('');
        }
    };

    if (loading) {
        return <div className="bg-black min-h-screen flex items-center justify-center text-white text-xs font-black uppercase tracking-widest animate-pulse">Loading...</div>;
    }

    return (
        <div className="bg-black min-h-screen text-white pb-32">
            <TopNav />
            <main className="pt-20 px-6 max-w-md mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                    </button>
                    <h1 className="text-2xl font-black italic tracking-tighter">DANCE CONDITIONS</h1>
                </div>

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Available Times / Days</label>
                            <input 
                                value={availability}
                                onChange={(e) => setAvailability(e.target.value)}
                                placeholder="e.g. Mon-Fri after 20:00, Weekends OK"
                                className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-pink-500/50 outline-none transition-all"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Price (per hour)</label>
                                <input 
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="e.g. 30,000 MMK"
                                    className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-pink-500/50 outline-none transition-all font-bold text-pink-500"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Location</label>
                                <input 
                                    value={place}
                                    onChange={(e) => setPlace(e.target.value)}
                                    placeholder="e.g. Yangon, Club only"
                                    className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-pink-500/50 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Short Comment</label>
                            <textarea 
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Your thoughts on dance or any notes for invitations..."
                                rows={3}
                                className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-pink-500/50 outline-none transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* Tags Section */}
                    <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-1">Style & Tag Settings</label>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {PREDEFINED_TAGS.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                                        selectedTags.includes(tag)
                                            ? 'bg-pink-600 border-pink-500 text-white'
                                            : 'bg-zinc-900 border-white/5 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                >
                                    #{tag}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input 
                                value={customTag}
                                onChange={(e) => setCustomTag(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                                placeholder="Add custom tag..."
                                className="flex-1 bg-zinc-900 border border-white/5 rounded-xl px-4 py-2 text-xs focus:border-pink-500/50 outline-none"
                            />
                            <button 
                                onClick={addCustomTag}
                                className="bg-zinc-800 px-4 rounded-xl text-xs font-bold border border-white/10"
                            >
                                Add
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white py-4 rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl shadow-pink-900/40 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </main>
            <BottomNav />
        </div>
    );
}
