'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';
import SlideOver from '../components/SlideOver';

export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isOperationsOpen, setIsOperationsOpen] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        
        const { data: { session } } = await supabase.auth.getSession();
        const authId = session?.user?.id;
        
        if (authId) {
            const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', authId)
                .single();
            setCurrentUser(profile);
        }

        // Fetch users and their counts/stats in aggregate
        const { data: usersData, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching users:', error);
        } else {
            // Batch fetch related stats to avoid individual RPCs for each user in list
            const { data: postCounts } = await supabase.rpc('get_user_post_counts');
            const { data: followStats } = await supabase.rpc('get_user_follow_stats');
            
            const enrichedUsers = (usersData || []).map(user => {
                const pc = postCounts?.find((p: any) => p.user_id === user.id);
                const fs = followStats?.find((f: any) => f.user_id === user.id);
                return {
                    ...user,
                    post_count: pc?.count || 0,
                    followers_count: fs?.followers_count || 0,
                    following_count: fs?.following_count || 0,
                    // Note: last_login is typically in auth.users, we might not have it in public.users
                    // unless we specifically sync it. We'll show NA or updated_at if missing.
                };
            });
            setUsers(enrichedUsers);
        }
        setLoading(false);
    };

    const ROLES = ['user', 'dancer', 'shop', 'admin', 'super admin', 'admin sales'];
    const ROLE_COLORS: Record<string, string> = {
        'user': 'bg-zinc-800 text-zinc-500 border-zinc-700',
        'dancer': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        'shop': 'bg-green-500/10 text-green-400 border-green-500/20',
        'admin': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        'super admin': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        'admin sales': 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    };

    const updateRole = async (userId: string, newRole: string) => {
        const { error } = await supabase
            .from('users')
            .update({ role: newRole })
            .eq('id', userId);
        
        if (error) {
            alert('Error updating role: ' + error.message);
        } else {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        }
    };

    const sendResetEmail = async (email: string) => {
        if (!email) {
            alert('User email is required to send reset link.');
            return;
        }
        
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            alert('Error sending reset email: ' + error.message);
        } else {
            alert('Password reset email sent successfully to ' + email);
        }
    };

    const fetchUserStats = async (userId: string) => {
        const { data, error } = await supabase.rpc('get_user_comprehensive_stats', { p_user_id: userId });
        if (error) console.error('Error fetching comprehensive stats:', error);
        return data;
    };

    const handleInfoClick = async (user: any) => {
        const stats = await fetchUserStats(user.id);
        setSelectedUser({ ...user, stats });
        setIsOperationsOpen(null);
    };

    const forcePasswordChange = async (userId: string) => {
        const newPassword = window.prompt('Enter new password for this user (Min 6 chars):');
        if (!newPassword) return;
        if (newPassword.length < 6) {
            alert('Password too short. Minimum 6 characters.');
            return;
        }

        try {
            console.log('--- Outgoing Password Reset Request ---');
            console.log('Target User ID:', userId);
            console.log('Admin ID:', currentUser?.id);

            const response = await fetch('/api/admin/users/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    newPassword,
                    adminId: currentUser?.id
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to update password');

            alert('Password updated successfully.');
        } catch (err: any) {
            console.error('Password Change UI Error:', err);
            alert('Password update failed.\nDetails: ' + err.message);
        }
    };

    const filteredUsers = users.filter(u => 
        u.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <LoadingScreen fullScreen={false} />;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
                    <input 
                        type="text" 
                        placeholder="Search by nickname or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold focus:border-pink-500/50 transition-all outline-none"
                    />
                </div>
                <button 
                    onClick={fetchUsers}
                    className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all group"
                    title="Refresh List"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-180 transition-transform duration-500">
                        <path d="M23 4v6h-6" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                </button>
            </div>

            <div className="bg-zinc-900/40 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                <th className="px-8 py-6">User</th>
                                <th className="px-8 py-6">Posts</th>
                                <th className="px-8 py-6">Status</th>
                                <th className="px-8 py-6">Last Login</th>
                                <th className="px-8 py-6">Language</th>
                                <th className="px-8 py-6">Joined</th>
                                <th className="px-8 py-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border border-white/10">
                                                {user.avatar_url ? (
                                                    <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-lg">👤</div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold truncate max-w-[150px]">{user.nickname || 'Dancer'}</p>
                                                <p className="text-[10px] text-zinc-500 font-mono italic truncate max-w-[150px]">{user.email || user.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-xs font-black text-pink-500">{user.post_count || 0}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-md tracking-tighter border ${
                                            ROLE_COLORS[user.role] || ROLE_COLORS['user']
                                        }`}>
                                            {user.role?.toUpperCase() || 'USER'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-[10px] font-bold text-zinc-500">
                                            {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                                        </p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-xs font-bold text-zinc-400">{user.language || 'EN'}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="text-xs font-bold text-zinc-400">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </p>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="relative flex justify-end">
                                            <button 
                                                onClick={() => setIsOperationsOpen(isOperationsOpen === user.id ? null : user.id)}
                                                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                            >
                                                Operations
                                                <svg className={`transition-transform duration-300 ${isOperationsOpen === user.id ? 'rotate-180' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
                                            </button>

                                            {isOperationsOpen === user.id && (
                                                <>
                                                    <div 
                                                        className="fixed inset-0 z-40"
                                                        onClick={() => setIsOperationsOpen(null)}
                                                    />
                                                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl z-50 py-2 animate-in fade-in zoom-in duration-200">
                                                        <button 
                                                            onClick={() => handleInfoClick(user)}
                                                            className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-3"
                                                        >
                                                            <span className="text-sm">ℹ️</span> Info
                                                        </button>
                                                        {currentUser?.role === 'super admin' && (
                                                            <>
                                                                <button 
                                                                    onClick={() => window.open(`/home?impersonate=${user.id}`, '_blank')}
                                                                    className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-600/10 transition-all flex items-center gap-3"
                                                                >
                                                                    <span className="text-sm">👤</span> Login
                                                                </button>
                                                                <button 
                                                                    onClick={() => forcePasswordChange(user.id)}
                                                                    className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-600/10 transition-all flex items-center gap-3"
                                                                >
                                                                    <span className="text-sm">🔑</span> Reset Key
                                                                </button>
                                                            </>
                                                        )}
                                                        <button 
                                                            onClick={() => sendResetEmail(user.email)}
                                                            className="w-full px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-3"
                                                        >
                                                            <span className="text-sm">✉️</span> Send Reset
                                                        </button>
                                                        <div className="px-4 py-2.5 border-t border-white/5">
                                                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-2">Change Role</span>
                                                            <select 
                                                                value={user.role || 'user'}
                                                                onChange={(e) => updateRole(user.id, e.target.value)}
                                                                className="w-full bg-zinc-800 border border-white/10 rounded-lg py-1.5 px-3 text-[9px] font-black uppercase tracking-widest outline-none focus:border-pink-500/50 transition-all cursor-pointer"
                                                            >
                                                                {ROLES.map(r => (
                                                                    <option key={r} value={r}>{r.toUpperCase()}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="p-20 text-center">
                        <p className="text-zinc-500 font-bold italic">No matching users found.</p>
                    </div>
                )}
            </div>

            {/* User Info SlideOver */}
            <SlideOver
                isOpen={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                title="User Inspection"
            >
                {selectedUser && (
                    <div className="flex flex-col h-[calc(100vh-100px)]">
                        <div className="flex-1 overflow-y-auto space-y-8 pb-32">
                            {/* Profile Header Card */}
                            <div className="p-8 bg-zinc-900 border border-white/5 rounded-[2.5rem] flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl mb-4">
                                    {selectedUser.avatar_url ? (
                                        <img src={selectedUser.avatar_url} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-3xl">👤</div>
                                    )}
                                </div>
                                <h4 className="text-2xl font-black text-white leading-tight">{selectedUser.nickname || 'Unknown Dancer'}</h4>
                                <div className="mt-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-zinc-400">
                                    {selectedUser.role?.toUpperCase() || 'USER'}
                                </div>
                                <p className="mt-4 text-[11px] text-zinc-400 leading-relaxed max-w-[250px] font-medium italic">
                                    {selectedUser.bio || selectedUser.short_bio || 'No biography provided.'}
                                </p>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-zinc-950/50 border border-white/5 rounded-2xl flex flex-col items-center">
                                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Posts</span>
                                    <span className="text-xl font-black text-pink-500">{selectedUser.stats?.posts_count || 0}</span>
                                </div>
                                <div className="p-4 bg-zinc-950/50 border border-white/5 rounded-2xl flex flex-col items-center">
                                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Total Likes</span>
                                    <span className="text-xl font-black text-rose-500">{selectedUser.stats?.likes_count || 0}</span>
                                </div>
                                <div className="p-4 bg-zinc-950/50 border border-white/5 rounded-2xl flex flex-col items-center">
                                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Impressions</span>
                                    <span className="text-xl font-black text-white">{selectedUser.stats?.impressions_count || 0}</span>
                                </div>
                                <div className="col-span-2 grid grid-cols-2 gap-4 mt-2">
                                    <div className="p-4 bg-zinc-950/50 border border-white/5 rounded-2xl flex flex-col items-center">
                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Following</span>
                                        <span className="text-xl font-black text-blue-400">{selectedUser.stats?.following_count || 0}</span>
                                    </div>
                                    <div className="p-4 bg-zinc-950/50 border border-white/5 rounded-2xl flex flex-col items-center">
                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Followers</span>
                                        <span className="text-xl font-black text-purple-400">{selectedUser.stats?.followers_count || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Metadata */}
                            <div className="p-6 bg-zinc-900 border border-white/5 rounded-3xl space-y-4">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">User Attributes</span>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                                        <span className="text-zinc-500 font-bold uppercase tracking-tight">Birth Date</span>
                                        <span className="text-white font-black">{selectedUser.birth_date ? new Date(selectedUser.birth_date).toLocaleDateString() : '—'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                                        <span className="text-zinc-500 font-bold uppercase tracking-tight">Gender</span>
                                        <span className="text-white font-black">{selectedUser.gender || '—'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                                        <span className="text-zinc-500 font-bold uppercase tracking-tight">Nationality</span>
                                        <span className="text-white font-black">{selectedUser.nationality || '—'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                                        <span className="text-zinc-500 font-bold uppercase tracking-tight">Language</span>
                                        <span className="text-white font-black">{selectedUser.language || 'EN'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* System IDs */}
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest block mb-2">Internal Identity</span>
                                <p className="text-[9px] font-mono text-zinc-500 break-all">{selectedUser.id}</p>
                            </div>
                        </div>
                    </div>
                )}
            </SlideOver>
        </div>
    );
}
