-- Final fix for column ambiguity in get_recommended_posts
-- Renames parameters and output columns to ensure no collisions.

DROP FUNCTION IF EXISTS public.get_recommended_posts(UUID);

CREATE OR REPLACE FUNCTION public.get_recommended_posts(p_viewer_id UUID DEFAULT NULL)
RETURNS TABLE (
    out_id UUID,
    out_user_id UUID,
    out_area TEXT,
    out_name TEXT,
    out_title TEXT,
    out_price_per_hour NUMERIC,
    out_currency TEXT,
    out_rating NUMERIC,
    out_main_image_url TEXT,
    out_location_name TEXT,
    out_shop_id UUID,
    out_created_at TIMESTAMPTZ,
    out_users JSONB,
    out_score NUMERIC
) LANGUAGE plpgsql AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    WITH engagement AS (
        SELECT 
            p_eng.id as eng_post_id,
            COUNT(DISTINCT l_eng.id) as eng_like_count,
            COUNT(DISTINCT c_eng.id) as eng_comment_count
        FROM public.posts p_eng
        LEFT JOIN public.likes l_eng ON l_eng.post_id = p_eng.id
        LEFT JOIN public.comments c_eng ON c_eng.post_id = p_eng.id
        GROUP BY p_eng.id
    ),
    seen_posts AS (
        SELECT sp.post_id as seen_post_id
        FROM public.post_impressions sp
        WHERE sp.user_id = p_viewer_id AND p_viewer_id IS NOT NULL
    )
    SELECT 
        p.id as out_id,
        p.user_id as out_user_id,
        p.area as out_area,
        p.name as out_name,
        p.title as out_title,
        p.price_per_hour as out_price_per_hour,
        p.currency as out_currency,
        p.rating as out_rating,
        p.main_image_url as out_main_image_url,
        p.location_name as out_location_name,
        p.shop_id as out_shop_id,
        p.created_at as out_created_at,
        jsonb_build_object(
            'nickname', u.nickname,
            'avatar_url', u.avatar_url,
            'role', u.role
        ) as out_users,
        (
            -- Scoring Logic
            (COALESCE(e.eng_like_count, 0) * 10 + COALESCE(e.eng_comment_count, 0) * 5 + 1) * -- Engagement
            POWER(0.8, EXTRACT(EPOCH FROM (now() - p.created_at)) / 86400) * -- Time Decay
            (CASE WHEN p.shop_id IS NOT NULL THEN 1.3 ELSE 1.0 END) * -- Shop Boost
            (CASE WHEN s.seen_post_id IS NOT NULL THEN 0.1 ELSE 1.0 END) -- Seen Penalty
        )::NUMERIC as out_score
    FROM public.posts p
    JOIN public.users u ON u.id = p.user_id
    LEFT JOIN engagement e ON e.eng_post_id = p.id
    LEFT JOIN seen_posts s ON s.seen_post_id = p.id
    ORDER BY out_score DESC, p.created_at DESC
    LIMIT 50;
END;
$$;
