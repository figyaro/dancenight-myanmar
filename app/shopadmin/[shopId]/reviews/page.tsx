'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

interface Review {
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    user: {
        nickname: string;
        avatar_url: string;
    };
}

export default function ShopReviewManagement() {
    const { shopId } = useParams();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [averageRating, setAverageRating] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const { data, error: fetchError } = await supabase
                    .from('reviews')
                    .select('*, user:users(nickname, avatar_url)')
                    .eq('shop_id', shopId)
                    .order('created_at', { ascending: false });

                if (fetchError) throw fetchError;
                if (data) {
                    setReviews(data);
                    const avg = data.reduce((acc, curr) => acc + curr.rating, 0) / data.length;
                    setAverageRating(Number(avg.toFixed(1)) || 0);
                }
            } catch (err: any) {
                console.error('Error fetching reviews:', err.message || err);
                setError(err.message || 'Failed to connect to database');
            } finally {
                setLoading(false);
            }
        };

        if (shopId) fetchReviews();
    }, [shopId]);

    if (loading) return <LoadingScreen />;

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center">
                <p className="text-red-500 font-bold mb-4">Error: {error}</p>
                <p className="text-zinc-500 text-xs text-left mb-6 font-mono bg-black/40 p-4 rounded-xl">
                    If you see "relation 'reviews' does not exist", please execute the SQL migration provided in walkthrough.md.
                </p>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-widest"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tight">Customer Reviews</h2>
                <div className="flex items-center gap-2">
                    <span className="text-2xl">⭐</span>
                    <span className="text-xl font-black">{averageRating || 'New'}</span>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">
                        ({reviews.length} {reviews.length === 1 ? 'REVIEW' : 'REVIEWS'})
                    </span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                {reviews.length > 0 ? (
                    reviews.map(review => (
                        <div key={review.id} className="bg-zinc-900 border border-white/5 p-6 rounded-3xl group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-white/10">
                                        {review.user?.avatar_url ? (
                                            <img src={review.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs opacity-20 font-black">U</div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase">{review.user?.nickname || 'Customer'}</p>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                            {new Date(review.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-0.5 text-[10px]">
                                    {[...Array(5)].map((_, i) => (
                                        <span key={i} className={i < review.rating ? 'grayscale-0' : 'grayscale opacity-30'}>⭐</span>
                                    ))}
                                </div>
                            </div>
                            <p className="text-sm text-zinc-300 font-medium leading-relaxed mb-4 italic">
                                "{review.comment || 'No comment provided.'}"
                            </p>
                            <div className="flex items-center gap-4">
                                <button className="text-[10px] font-black text-pink-500 uppercase tracking-widest hover:underline transition-all active:scale-95">Reply</button>
                                <button className="text-[10px] font-black text-zinc-600 uppercase tracking-widest hover:text-white transition-all">Hide Review</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-zinc-900/50 border border-dashed border-white/5 rounded-3xl py-20 text-center">
                        <div className="text-4xl mb-4 opacity-10">⭐</div>
                        <p className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em]">No reviews to manage yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}
