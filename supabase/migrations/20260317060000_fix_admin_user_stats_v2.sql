-- Optimized get_users_with_stats to improve performance and add missing fields
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
    dtip_balance BIGINT,
    followers_count BIGINT,
    following_count BIGINT,
    likes_count BIGINT,
    impressions_count BIGINT
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
    ),
    user_followers AS (
        SELECT f.following_id as user_id, COUNT(*) as count
        FROM public.follows f
        GROUP BY f.following_id
    ),
    user_following AS (
        SELECT f.follower_id as user_id, COUNT(*) as count
        FROM public.follows f
        GROUP BY f.follower_id
    ),
    user_likes AS (
        SELECT p.user_id, COUNT(l.id) as count
        FROM public.posts p
        LEFT JOIN public.likes l ON l.post_id = p.id
        GROUP BY p.user_id
    ),
    user_impressions AS (
        SELECT p.user_id, COUNT(ae.id) as count
        FROM public.posts p
        LEFT JOIN public.analytics_events ae ON ae.post_id = p.id AND ae.event_type = 'post_impression'
        GROUP BY p.user_id
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
        COALESCE(w.balance, 0) as dtip_balance,
        COALESCE(f_ers.count, 0) as followers_count,
        COALESCE(f_ing.count, 0) as following_count,
        COALESCE(l.count, 0) as likes_count,
        COALESCE(i.count, 0) as impressions_count
    FROM public.users u
    LEFT JOIN user_post_counts pc ON pc.user_id = u.id
    LEFT JOIN user_wallets w ON w.user_id = u.id
    LEFT JOIN user_followers f_ers ON f_ers.user_id = u.id
    LEFT JOIN user_following f_ing ON f_ing.user_id = u.id
    LEFT JOIN user_likes l ON l.user_id = u.id
    LEFT JOIN user_impressions i ON i.user_id = u.id
    ORDER BY u.created_at DESC;
END;
$$;

-- Update get_user_comprehensive_stats to ensure consistency
CREATE OR REPLACE FUNCTION public.get_user_comprehensive_stats(p_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'post_count', (SELECT COUNT(*) FROM public.posts WHERE user_id = p_user_id),
        'dtip_balance', COALESCE((SELECT balance FROM public.wallets WHERE user_id = p_user_id), 0),
        'likes_count', (SELECT COUNT(*) FROM public.likes WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = p_user_id)),
        'impressions_count', (
            SELECT COUNT(*) FROM public.analytics_events 
            WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = p_user_id) 
            AND event_type = 'post_impression'
        ),
        'followers_count', (SELECT COUNT(*) FROM public.follows WHERE following_id = p_user_id),
        'following_count', (SELECT COUNT(*) FROM public.follows WHERE follower_id = p_user_id)
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.get_user_comprehensive_stats(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_with_stats() TO authenticated;
