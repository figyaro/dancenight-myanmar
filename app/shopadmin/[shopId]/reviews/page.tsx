'use client';

export default function ShopReviewManagement() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black uppercase tracking-tight">Customer Reviews</h2>
                <div className="flex items-center gap-2">
                    <span className="text-2xl">⭐</span>
                    <span className="text-xl font-black">4.8</span>
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">(124 REVIEWS)</span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-zinc-900 border border-white/5 p-6 rounded-3xl group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-zinc-800" />
                                <div>
                                    <p className="text-xs font-black">Reviewer {i}</p>
                                    <p className="text-[10px] text-zinc-500 font-bold">2 days ago</p>
                                </div>
                            </div>
                            <div className="flex gap-0.5 text-[10px]">
                                {[1, 2, 3, 4, 5].map(s => <span key={s}>⭐</span>)}
                            </div>
                        </div>
                        <p className="text-sm text-zinc-300 font-medium leading-relaxed mb-4">
                            Great experience at this place! The atmosphere was amazing and the staff was very professional. Will definitely visit again.
                        </p>
                        <button className="text-[10px] font-black text-pink-500 uppercase tracking-widest hover:underline">Reply to Review</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
