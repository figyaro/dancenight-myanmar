'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import LoadingScreen from '../../components/LoadingScreen';

export default function UserManagement() {
    const [users, setUsers] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        
        // Fetch current user for role check using getSession for stability
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

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) console.error('Error fetching users:', error);
        else setUsers(data || []);
        setLoading(false);
    };

    const ROLES = ['user', 'dancer', 'shop', 'admin', 'super admin'];
    const ROLE_COLORS: Record<string, string> = {
        'user': 'bg-zinc-800 text-zinc-500 border-zinc-700',
        'dancer': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        'shop': 'bg-green-500/10 text-green-400 border-green-500/20',
        'admin': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        'super admin': 'bg-blue-500/10 text-blue-400 border-blue-500/20'
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
                                <th className="px-8 py-6">Status</th>
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
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-md tracking-tighter border ${
                                            ROLE_COLORS[user.role] || ROLE_COLORS['user']
                                        }`}>
                                            {user.role?.toUpperCase() || 'USER'}
                                        </span>
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
                                        <div className="flex items-center justify-end gap-3">
                                            {currentUser?.role === 'super admin' && (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => window.open(`/home?impersonate=${user.id}`, '_blank')}
                                                        className="text-[9px] font-black px-3 py-1.5 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20 hover:bg-blue-600/20 transition-all uppercase tracking-widest"
                                                        title="Impersonate User"
                                                    >
                                                        Login
                                                    </button>
                                                    <button 
                                                        onClick={() => forcePasswordChange(user.id)}
                                                        className="text-[9px] font-black px-3 py-1.5 rounded-lg bg-red-600/10 text-red-400 border border-red-500/20 hover:bg-red-600/20 transition-all uppercase tracking-widest"
                                                        title="Force Password Change"
                                                    >
                                                        Key
                                                    </button>
                                                </div>
                                            )}
                                            <button 
                                                onClick={() => sendResetEmail(user.email)}
                                                className="text-[9px] font-black px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 border border-white/5 hover:bg-zinc-700 transition-all uppercase tracking-widest"
                                                title="Send Reset Email"
                                            >
                                                Reset
                                            </button>
                                            <select 
                                                value={user.role || 'user'}
                                                onChange={(e) => updateRole(user.id, e.target.value)}
                                                className="bg-zinc-900 border border-white/10 rounded-lg py-1 px-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-pink-500/50 transition-all cursor-pointer"
                                            >
                                                {ROLES.map(r => (
                                                    <option key={r} value={r}>{r.toUpperCase()}</option>
                                                ))}
                                            </select>
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
        </div>
    );
}
