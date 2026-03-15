import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { userId, newPassword, adminId } = await req.json();

        console.log('--- Password Reset API Debug ---');
        console.log('Incoming IDs:', { userId, adminId });

        if (!userId || !newPassword || !adminId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Initialize Supabase with Service Role Key for Admin operations
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!serviceRoleKey || !supabaseUrl) {
            console.error('[AuthLink] Missing Supabase configuration');
            return NextResponse.json({ 
                error: 'Server configuration missing: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL.' 
            }, { status: 500 });
        }

        // --- CRITICAL DEPLOYMENT CHECK ---
        // Many users accidentally supply the ANON key as the SERVICE ROLE key in cloud environments.
        // The ANON key will allow basic database reads (if RLS permits) but will hard-fail with 
        // 403 "User not allowed" on any auth.admin.* calls.
        try {
            // A JWT has 3 parts separated by dots. The payload is the second part (base64 encoded).
            const jwtPayload = JSON.parse(Buffer.from(serviceRoleKey.split('.')[1], 'base64').toString());
            if (jwtPayload.role !== 'service_role') {
                console.error(`[AuthLink] FATAL: SUPABASE_SERVICE_ROLE_KEY is actually a '${jwtPayload.role}' key!`);
                return NextResponse.json({ 
                    error: `CRITICAL DEPLOYMENT ERROR: The SUPABASE_SERVICE_ROLE_KEY environment variable is incorrectly set to an '${jwtPayload.role}' key (likely the anon key). You MUST use the actual Service Role Key (found in Supabase > Settings > API) for admin operations.` 
                }, { status: 500 });
            }
        } catch (e) {
            console.warn('[AuthLink] Could not parse serviceRoleKey as JWT. Proceeding anyway, but it may be invalid.');
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        // Security Check: Verify that the requesting user is a Super Admin
        console.log('[AuthLink] Verifying requester role for ID:', adminId);
        const { data: adminProfile, error: adminError } = await supabaseAdmin
            .from('users')
            .select('role, email')
            .eq('id', adminId)
            .single();

        if (adminError) {
            console.error('[AuthLink] Admin fetch error:', adminError);
            return NextResponse.json({ 
                error: `DEBUG_ERR_ADMIN_FETCH: ${adminError.message}` 
            }, { status: 403 });
        }

        console.log('[AuthLink] Requester profile found:', adminProfile);

        if (adminProfile?.role !== 'super admin') {
            console.warn('[AuthLink] Requester is NOT a super admin. Role:', adminProfile?.role);
            return NextResponse.json({ 
                error: `DEBUG_ERR_ROLE_MISMATCH: Role is '${adminProfile?.role}'` 
            }, { status: 403 });
        }

        console.log('[AuthLink] Authorization granted. Proceeding with operation for user:', userId);

        // 1. Explicitly fetch the target user's Auth metadata to check their status
        const { data: authUser, error: authFetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
        console.log('[AuthLink] Target Auth User status:', { 
            exists: !!authUser?.user, 
            email_confirmed: authUser?.user?.email_confirmed_at,
            last_sign_in: authUser?.user?.last_sign_in_at,
            banned_until: authUser?.user?.banned_until,
            error: authFetchError?.message 
        });

        // 2. Perform the password update using Auth Admin API
        // Added email_confirm: true to see if it bypasses any 'unconfirmed' restrictions
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { 
                password: newPassword,
                email_confirm: true 
            }
        );

        if (error) {
            // Handle "User not found" by attempting to create the Auth record
            if (error.message.includes('User not found') || (error as any).status === 404) {
                // Fetch basic user data to create the auth record
                const { data: userData, error: fetchError } = await supabaseAdmin
                    .from('users')
                    .select('email, nickname')
                    .eq('id', userId)
                    .single();

                if (fetchError || !userData?.email) {
                    return NextResponse.json({ error: 'User found in database but email is missing or fetch failed.' }, { status: 404 });
                }

                console.log(`[AuthLink] Proceeding to create Auth record for ${userData.email} with ID ${userId}`);
                const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    id: userId,
                    email: userData.email,
                    password: newPassword,
                    email_confirm: true,
                    user_metadata: {
                        name: userData.nickname || 'User'
                    }
                });

                if (createError) {
                    console.error('[AuthLink] Auth createUser failed:', createError);
                    return NextResponse.json({ error: `Failed to create Auth: ${createError.message}` }, { status: 500 });
                }

                console.log(`[AuthLink] Auth record created successfully:`, authData?.user?.id);
                return NextResponse.json({ message: 'Auth account successfully created and linked.' });
            }

            console.error('[AuthLink] Supabase Update Error Details:', {
                message: error.message,
                status: (error as any).status,
                name: (error as any).name
            });
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: 'Password updated successfully' });

    } catch (err: any) {
        console.error('Password overwrite error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
