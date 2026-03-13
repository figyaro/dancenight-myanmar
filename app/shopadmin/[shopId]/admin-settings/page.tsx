'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import LoadingScreen from '../../../components/LoadingScreen';

interface Member {
    id: string;
    user_id: string;
    role: string;
    permissions: string[];
    status: string;
    user?: {
        email: string;
        nickname: string;
    }
}

const PERMISSION_OPTIONS = [
    { id: '/posts', name: 'Post Management' },
    { id: '/customers', name: 'User Management' },
    { id: '/reservations', name: 'Reservation Management' },
    { id: '/events', name: 'Event Management' },
    { id: '/staff', name: 'DJ/Staff Management' },
    { id: '/rooms', name: 'Room Management' },
    { id: '/menu', name: 'Menu Management' },
    { id: '/plans', name: 'Plan Management' },
    { id: '/reviews', name: 'Reviews' },
    { id: '/tools', name: 'Attraction Tools' },
    { id: '/sns', name: 'SNS Integration' },
    { id: '/settings', name: 'Shop Settings' },
];

export default function AdminSettings() {
    const { shopId } = useParams();
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<Member[]>([]);
    const [invitingEmail, setInvitingEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setCurrentUser(user);

                // Fetch members - selective columns to avoid whole query failure if new ones don't exist yet
                const { data: membersData, error } = await supabase
                    .from('shop_members')
                    .select('id, user_id, role')
                    .eq('shop_id', shopId);

                if (error) throw error;

                // Enrich with user data and permissions/status manually to handle missing columns
                const enrichedMembers = await Promise.all((membersData || []).map(async (m: any) => {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('email, nickname')
                        .eq('id', m.user_id)
                        .maybeSingle();
                    
                    // Try to fetch permissions/status individually to see if they exist
                    const { data: extraData } = await supabase
                        .from('shop_members')
                        .select('permissions, status')
                        .eq('id', m.id)
                        .maybeSingle();

                    return {
                        ...m,
                        permissions: extraData?.permissions || [],
                        status: extraData?.status || 'active',
                        user: userData
                    };
                }));

                setMembers(enrichedMembers as Member[]);
            } catch (err) {
                console.error('Error fetching admin settings:', err);
            } finally {
                setLoading(false);
            }
        };

        if (shopId) fetchData();
    }, [shopId]);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invitingEmail) return;

        setIsInviting(true);
        try {
            // 1. Check if user exists
            const { data: existingUser, error: userError } = await supabase
                .from('users')
                .select('id, email')
                .eq('email', invitingEmail.toLowerCase())
                .maybeSingle();

            if (userError) throw userError;

            if (existingUser) {
                // Link existing user as sub-admin
                const { error: linkError } = await supabase
                    .from('shop_members')
                    .insert({
                        shop_id: shopId,
                        user_id: existingUser.id,
                        role: 'sub-admin',
                        status: 'pending', // Requires re-verification or approval
                        permissions: []
                    });

                if (linkError) throw linkError;
                alert('Existing user linked. They need to verify the invitation.');
            } else {
                // For new users, we might need a more complex invitation flow or just create a placeholder
                // For now, let's warn that registration is required or implement user creation if superadmin
                alert('User not found. Direct registration and invitation flow is being refined.');
            }

            // Refresh list
            const { data: refreshData, error: refreshError } = await supabase
                .from('shop_members')
                .select('id, user_id, role')
                .eq('shop_id', shopId);

            if (refreshError) throw refreshError;
            
            const enrichedRefresh = await Promise.all((refreshData || []).map(async (m: any) => {
                const { data: userData } = await supabase
                    .from('users')
                    .select('email, nickname')
                    .eq('id', m.user_id)
                    .maybeSingle();
                
                const { data: extraData } = await supabase
                    .from('shop_members')
                    .select('permissions, status')
                    .eq('id', m.id)
                    .maybeSingle();

                return {
                    ...m,
                    permissions: extraData?.permissions || [],
                    status: extraData?.status || 'active',
                    user: userData
                };
            }));

            setMembers(enrichedRefresh as Member[]);
            setInvitingEmail('');
        } catch (err: any) {
            alert('Error inviting member: ' + err.message);
        } finally {
            setIsInviting(false);
        }
    };

    const togglePermission = async (memberId: string, permissionId: string) => {
        const member = members.find(m => m.id === memberId);
        if (!member) return;

        const newPermissions = member.permissions.includes(permissionId)
            ? member.permissions.filter(p => p !== permissionId)
            : [...member.permissions, permissionId];

        try {
            const { error } = await supabase
                .from('shop_members')
                .update({ permissions: newPermissions })
                .eq('id', memberId);

            if (error) throw error;

            setMembers(members.map(m => 
                m.id === memberId ? { ...m, permissions: newPermissions } : m
            ));
        } catch (err: any) {
            alert('Error updating permissions: ' + err.message);
        }
    };

    const removeMember = async (memberId: string) => {
        if (!confirm('Are you sure you want to remove this member?')) return;

        try {
            const { error } = await supabase
                .from('shop_members')
                .delete()
                .eq('id', memberId);

            if (error) throw error;
            setMembers(members.filter(m => m.id !== memberId));
        } catch (err: any) {
            alert('Error removing member: ' + err.message);
        }
    };

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Account Info Section */}
            <section className="bg-zinc-900/40 border border-white/5 rounded-[40px] p-10 backdrop-blur-3xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-pink-600/5 blur-[100px] -mr-48 -mt-48 transition-all group-hover:bg-pink-600/10" />
                
                <h2 className="text-[10px] font-black text-pink-500 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
                    <span className="w-8 h-px bg-pink-500/30" />
                    Account Security
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Store Administrator Email</label>
                        <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-2xl p-4">
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg">📧</div>
                            <span className="text-sm font-bold opacity-60">{currentUser?.email}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Team Management Section */}
            <section className="bg-zinc-900/40 border border-white/5 rounded-[40px] p-10 backdrop-blur-3xl overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                    <div>
                        <h2 className="text-[10px] font-black text-pink-500 uppercase tracking-[0.3em] mb-3 flex items-center gap-3">
                            <span className="w-8 h-px bg-pink-500/30" />
                            Team Management
                        </h2>
                        <p className="text-zinc-500 text-xs font-bold font-medium">Manage access for your shop staff and sub-admins.</p>
                    </div>

                    <form onSubmit={handleInvite} className="flex gap-4">
                        <input 
                            type="email"
                            placeholder="Staff email address"
                            value={invitingEmail}
                            onChange={(e) => setInvitingEmail(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-2xl py-3 px-6 text-xs font-bold placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/50 transition-all w-64"
                        />
                        <button 
                            disabled={isInviting}
                            className="px-8 py-3 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-pink-500 hover:text-white transition-all disabled:opacity-50"
                        >
                            {isInviting ? 'INVITING...' : 'ADD MEMBER'}
                        </button>
                    </form>
                </div>

                <div className="space-y-6">
                    {members.map((member) => (
                        <div key={member.id} className="bg-black/20 border border-white/5 rounded-3xl p-8 hover:border-white/10 transition-all group">
                            <div className="flex flex-col lg:flex-row justify-between gap-8">
                                <div className="flex items-start gap-6">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform">
                                        👤
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-black text-sm tracking-tight">{member.user?.email}</h3>
                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                                                member.role === 'owner' ? 'bg-pink-600 text-white' : 'bg-zinc-800 text-zinc-400'
                                            }`}>
                                                {member.role}
                                            </span>
                                            {member.status !== 'active' && (
                                                <span className="text-[8px] font-black px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 uppercase tracking-widest">
                                                    {member.status}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] font-medium text-zinc-500">ID: {member.id}</p>
                                    </div>
                                </div>

                                {member.role === 'sub-admin' && (
                                    <div className="flex-1 lg:max-w-xl">
                                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Module Permissions</p>
                                        <div className="flex flex-wrap gap-2">
                                            {PERMISSION_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    onClick={() => togglePermission(member.id, opt.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all border ${
                                                        member.permissions.includes(opt.id)
                                                        ? 'bg-pink-600/10 border-pink-500/50 text-pink-500'
                                                        : 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/20'
                                                    }`}
                                                >
                                                    {opt.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-end">
                                    {member.role !== 'owner' && (
                                        <button 
                                            onClick={() => removeMember(member.id)}
                                            className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
