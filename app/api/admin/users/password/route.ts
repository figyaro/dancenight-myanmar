import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { userId, newPassword, adminId } = await req.json();

        if (!userId || !newPassword || !adminId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Initialize Supabase with Service Role Key for Admin operations
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || '',
            process.env.SUPABASE_SERVICE_ROLE_KEY || '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Security Check: Verify that the requesting user is a Super Admin
        const { data: adminProfile, error: adminError } = await supabaseAdmin
            .from('users')
            .select('role')
            .eq('id', adminId)
            .single();

        if (adminError || adminProfile?.role !== 'super admin') {
            return NextResponse.json({ error: 'Unauthorized. Only Super Admins can force password changes.' }, { status: 403 });
        }

        // Perform the password update using Auth Admin API
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: 'Password updated successfully' });

    } catch (err: any) {
        console.error('Password overwrite error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
