-- Final fix: Use a unique name and scalar subqueries (proven to work in single-user context)
-- Limits to 1000 users for performance.

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
        (SELECT COUNT(*) FROM public.posts p WHERE p.user_id = u.id) as post_count,
        COALESCE((SELECT balance FROM public.wallets w WHERE w.user_id = u.id), 0) as dtip_balance
    FROM public.users u
    ORDER BY u.created_at DESC
    LIMIT 1000;
END;
$$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.get_admin_user_stats_v4() TO authenticated;
