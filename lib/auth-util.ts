import { supabase } from './supabase';

/**
 * Returns the effective user ID for the current session.
 * If the Super Admin is impersonating another user, returns the impersonated ID.
 * Otherwise, returns the authenticated user's ID.
 */
export async function getEffectiveUserId(): Promise<string | null> {
    if (typeof window !== 'undefined') {
        const impersonatedId = sessionStorage.getItem('impersonatedId');
        if (impersonatedId) return impersonatedId;
    }

    // Use getSession() instead of getUser() for performance and to avoid refresh token loops
    // in multiple concurrent calls.
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;

    // Fallback to getUser() if no session is found (e.g. initial load or race condition)
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
}

/**
 * Checks if the current session is in impersonation mode.
 */
export function isImpersonating(): boolean {
    if (typeof window !== 'undefined') {
        return !!sessionStorage.getItem('impersonatedId');
    }
    return false;
}

/**
 * Clears the impersonation state.
 */
export function stopImpersonating() {
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem('impersonatedId');
        sessionStorage.removeItem('impersonatedName');
        window.location.reload();
    }
}
