'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TopNav from '../../components/TopNav';
import BottomNav from '../../components/BottomNav';
import { supabase } from '../../../lib/supabase';
import EventForm from '../../components/EventForm';

function CreateEventContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get('edit');
    const [initialData, setInitialData] = useState<any>(null);
    const [loading, setLoading] = useState(!!editId);

    useEffect(() => {
        const checkAuthAndFetch = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            if (editId) {
                const { data, error } = await supabase
                    .from('events')
                    .select('*')
                    .eq('id', editId)
                    .single();
                
                if (!error && data) {
                    setInitialData(data);
                }
                setLoading(false);
            }
        };
        checkAuthAndFetch();
    }, [router, editId]);

    const handleSuccess = () => {
        router.push(editId ? '/admin/events' : '/events');
        router.refresh();
    };

    return (
        <div className="bg-black min-h-screen text-white">
            <TopNav />
            <main className="pt-24 pb-24 px-4 max-w-md mx-auto relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-black tracking-wider uppercase">
                        {editId ? 'Edit Event' : 'Host an Event'}
                    </h1>
                    <div className="w-10"></div>
                </div>

                {!loading && (
                    <EventForm 
                        initialData={initialData} 
                        onSuccess={handleSuccess} 
                    />
                )}

                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                        <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin mb-4" />
                        <p className="text-zinc-500 font-black tracking-widest text-[10px] uppercase">Loading Event Data...</p>
                    </div>
                )}
            </main>
            <BottomNav />
        </div>
    );
}

export default function CreateEvent() {
    return (
        <Suspense fallback={
            <div className="bg-black min-h-screen text-white flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
            </div>
        }>
            <CreateEventContent />
        </Suspense>
    );
}
