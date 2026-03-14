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
            console.error('[AuthLink] Supabase Update Error Details:', {
                message: error.message,
                status: (error as any).status, // GoTrue error usually has status
                name: (error as any).name
            });
            // Handle "User not found" by attempting to create the Auth record
            if (error.message.includes('User not found')) {
                // 1. Fetch user data from database for backup
                const { data: userData, error: fetchError } = await supabaseAdmin
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (fetchError || !userData?.email) {
                    return NextResponse.json({ error: 'User found in database but email is missing or fetch failed.' }, { status: 404 });
                }

                // 2. Temporarily remove the user from public.users to avoid trigger conflict
                console.log(`[AuthLink] Attempting to delete existing record for ${userId}`);
                const { error: deleteError, count } = await supabaseAdmin
                    .from('users')
                    .delete({ count: 'exact' })
                    .eq('id', userId);

                if (deleteError) {
                    console.error('[AuthLink] Delete failed:', deleteError);
                    return NextResponse.json({ error: `Failed to clear existing record: ${deleteError.message}` }, { status: 500 });
                }
                console.log(`[AuthLink] Delete successful. Rows affected: ${count}`);

                // 2b. DOUBLE CHECK that it's really gone
                const { data: checkData } = await supabaseAdmin
                    .from('users')
                    .select('id')
                    .eq('id', userId)
                    .maybeSingle();
                
                if (checkData) {
                    console.error('[AuthLink] CRITICAL: Row still exists after delete! Likely foreign key restriction.');
                    return NextResponse.json({ 
                        error: 'Failed to link Auth: The user record could not be removed (likely due to existing posts, bookings, or other linked data). Please delete the user\'s data first or contact support.' 
                    }, { status: 500 });
                }

                // 3. Create the Auth record with the same ID
                console.log(`[AuthLink] Proceeding to create Auth record for ${userData.email} with ID ${userId}`);
                const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    id: userId,
                    email: userData.email,
                    password: newPassword,
                    email_confirm: true
                });

                if (createError) {
                    console.error('[AuthLink] Auth createUser failed:', createError);
                    // Critical: If Auth creation fails, we MUST try to restore the original record
                    await supabaseAdmin.from('users').insert([userData]);
                    return NextResponse.json({ error: `Failed to create Auth: ${createError.message}` }, { status: 500 });
                }
                console.log(`[AuthLink] Auth record created successfully:`, authData?.user?.id);

                // 4. Update the newly created record with original data to preserve role, etc.
                console.log(`[AuthLink] Restoring user attributes for ${userId}`);
                const { error: restoreError } = await supabaseAdmin
                    .from('users')
                    .update({
                        nickname: userData.nickname,
                        role: userData.role,
                        avatar_url: userData.avatar_url,
                        language: userData.language,
                        location: userData.location,
                    })
                    .eq('id', userId);

                if (restoreError) {
                    console.error('Failed to restore user attributes:', restoreError);
                    // We don't fail the whole request here as the Auth record is already created
                }

                return NextResponse.json({ message: 'Auth account successfully created and linked with data preservation.' });
            }

            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: 'Password updated successfully' });

    } catch (err: any) {
        console.error('Password overwrite error:', err);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
