-- RPC to get post counts for all users
CREATE OR REPLACE FUNCTION public.get_user_post_counts()
RETURNS TABLE (user_id UUID, count BIGINT) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT p.user_id, COUNT(*)
    FROM public.posts p
    GROUP BY p.user_id;
END;
$$;

-- RPC to get follow stats for all users
CREATE OR REPLACE FUNCTION public.get_user_follow_stats()
RETURNS TABLE (user_id UUID, followers_count BIGINT, following_count BIGINT) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH followers AS (
        SELECT following_id as u_id, COUNT(*) as f_count
        FROM public.follows
        GROUP BY following_id
    ),
    following AS (
        SELECT follower_id as u_id, COUNT(*) as fl_count
        FROM public.follows
        GROUP BY follower_id
    )
    SELECT 
        u.id as user_id,
        COALESCE(fer.f_count, 0) as followers_count,
        COALESCE(fing.fl_count, 0) as following_count
    FROM public.users u
    LEFT JOIN followers fer ON fer.u_id = u.id
    LEFT JOIN following fing ON fing.u_id = u.id;
END;
$$;

-- RPC to get comprehensive stats for a single user (for Info Modal)
CREATE OR REPLACE FUNCTION public.get_user_comprehensive_stats(p_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'posts_count', (SELECT COUNT(*) FROM public.posts WHERE user_id = p_user_id),
        'likes_count', (SELECT COUNT(*) FROM public.likes WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = p_user_id)),
        'impressions_count', (SELECT COUNT(*) FROM public.analytics_events WHERE post_id IN (SELECT id FROM public.posts WHERE user_id = p_user_id) AND event_type = 'post_impression'),
        'followers_count', (SELECT COUNT(*) FROM public.follows WHERE following_id = p_user_id),
        'following_count', (SELECT COUNT(*) FROM public.follows WHERE follower_id = p_user_id)
    ) INTO result;
    
    RETURN result;
END;
$$;
