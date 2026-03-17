-- Ultra-lightweight get_users_with_stats to prevent timeouts
DROP FUNCTION IF EXISTS public.get_users_with_stats();

CREATE OR REPLACE FUNCTION public.get_users_with_stats()
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
    WITH user_post_counts AS (
        SELECT p.user_id, COUNT(*) as count
        FROM public.posts p
        GROUP BY p.user_id
    ),
    user_wallets AS (
        SELECT w.user_id, w.balance
        FROM public.wallets w
    )
    SELECT 
        u.id,
        u.nickname,
        u.email,
        u.role,
        u.avatar_url,
        u.language,
        u.gender,
        u.nationality,
        u.birth_date,
        u.bio,
        u.short_bio,
        u.created_at,
        u.last_login_at,
        COALESCE(pc.count, 0) as post_count,
        COALESCE(w.balance, 0) as dtip_balance
    FROM public.users u
    LEFT JOIN user_post_counts pc ON pc.user_id = u.id
    LEFT JOIN user_wallets w ON w.user_id = u.id
    ORDER BY u.created_at DESC;
END;
$$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.get_users_with_stats() TO authenticated;
