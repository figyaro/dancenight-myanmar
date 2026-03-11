'use client';

export default function SystemSettings() {
    return (
        <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
            <h2 className="text-xl font-black uppercase tracking-tighter">System Configuration</h2>

            <div className="grid grid-cols-1 gap-6">
                {/* Security Section */}
                <section className="bg-zinc-900/40 rounded-3xl border border-white/5 p-8 backdrop-blur-xl">
                    <h3 className="font-black text-sm uppercase tracking-widest text-pink-500 mb-6 flex items-center gap-2">
                        🛡️ Security & Access
                    </h3>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div>
                                <p className="text-sm font-bold">Maintenance Mode</p>
                                <p className="text-xs text-zinc-500 font-medium mt-1">Only admins can access the frontend.</p>
                            </div>
                            <div className="w-12 h-6 bg-zinc-800 rounded-full relative cursor-pointer">
                                <div className="absolute left-1 top-1 w-4 h-4 bg-white/20 rounded-full" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div>
                                <p className="text-sm font-bold">New Registrations</p>
                                <p className="text-xs text-zinc-500 font-medium mt-1">Allow new users to create accounts.</p>
                            </div>
                            <div className="w-12 h-6 bg-pink-600 rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* API Section */}
                <section className="bg-zinc-900/40 rounded-3xl border border-white/5 p-8 backdrop-blur-xl">
                    <h3 className="font-black text-sm uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                        🔗 API & Integrations
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Supabase Endpoint</label>
                            <input 
                                type="text" 
                                readOnly 
                                value="https://bgbmkenuarxsepclukgc.supabase.co"
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-xs font-mono text-zinc-400 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">Google Maps API Status</label>
                            <div className="px-4 py-3 bg-green-500/10 border border-green-500/10 rounded-xl text-xs font-bold text-green-400">
                                ACTIVE / VERIFIED
                            </div>
                        </div>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="bg-red-500/5 rounded-3xl border border-red-500/20 p-8 backdrop-blur-xl">
                    <h3 className="font-black text-sm uppercase tracking-widest text-red-500 mb-6">Danger Zone</h3>
                    <button className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase text-white shadow-lg shadow-red-900/20">
                        Flush Cache
                    </button>
                </section>
            </div>
        </div>
    );
}
