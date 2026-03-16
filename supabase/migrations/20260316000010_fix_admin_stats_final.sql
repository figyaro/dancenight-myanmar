-- Fix RPCs for user statistics consistency
-- Standardization: post_count, followers_count, following_count, likes_count, impressions_count

-- 1. Update get_users_with_stats (Fixing last_login column name)
CREATE OR REPLACE FUNCTION public.get_users_with_stats()
RETURNS TABLE (
    id UUID,
    nickname TEXT,
    email TEXT,
    role TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ, -- Fixed from last_login
    post_count BIGINT,
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
    SELECT 
        u.id,
        u.nickname,
        u.email,
        u.role,
        u.avatar_url,
        u.created_at,
        u.last_login_at, -- Fixed
        (SELECT COUNT(*) FROM public.posts p WHERE p.user_id = u.id) as post_count,
        (SELECT COUNT(*) FROM public.follows f WHERE f.following_id = u.id) as followers_count,
        (SELECT COUNT(*) FROM public.follows f WHERE f.follower_id = u.id) as following_count,
        (SELECT COUNT(*) FROM public.likes l WHERE l.post_id IN (SELECT id FROM public.posts p WHERE p.user_id = u.id)) as likes_count,
        (SELECT COUNT(*) FROM public.analytics_events ae WHERE ae.post_id IN (SELECT id FROM public.posts p WHERE p.user_id = u.id) AND ae.event_type = 'post_impression') as impressions_count
    FROM public.users u
    ORDER BY u.created_at DESC;
END;
$$;

-- 2. Update get_user_comprehensive_stats (Standardizing posts_count to post_count)
CREATE OR REPLACE FUNCTION public.get_user_comprehensive_stats(p_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'post_count', (SELECT COUNT(*) FROM public.posts WHERE user_id = p_user_id), -- Standardized
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

-- Grant permissions again to ensure they are active
GRANT EXECUTE ON FUNCTION public.get_user_comprehensive_stats(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_with_stats() TO authenticated;
