-- Fix get_admin_user_stats_v4 return type mismatch caused by varchar user fields.
-- PostgREST rejects the RPC when a returned column type does not exactly match
-- the declared RETURNS TABLE type, which made the admin user list fall back to
-- plain users and display every post count as 0.

CREATE OR REPLACE FUNCTION public.get_admin_user_stats_v4()
RETURNS TABLE (
    id UUID,
    nickname TEXT,
    email TEXT,
    role TEXT,
    avatar_url TEXT,
    language TEXT,
    gender TEXT,
    nationality TEXT,
    birth_date DATE,
    bio TEXT,
    short_bio TEXT,
    created_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    post_count BIGINT,
    dtip_balance BIGINT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.nickname::TEXT,
        u.email::TEXT,
        u.role::TEXT,
        u.avatar_url::TEXT,
        u.language::TEXT,
        u.gender::TEXT,
        u.nationality::TEXT,
        u.birth_date,
        u.bio::TEXT,
        u.short_bio::TEXT,
        u.created_at,
        u.last_login_at,
        (SELECT COUNT(*) FROM public.posts p WHERE p.user_id = u.id)::BIGINT AS post_count,
        COALESCE((SELECT w.balance FROM public.wallets w WHERE w.user_id = u.id LIMIT 1), 0)::BIGINT AS dtip_balance
    FROM public.users u
    ORDER BY u.created_at DESC
    LIMIT 1000;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_user_stats_v4() TO authenticated;
