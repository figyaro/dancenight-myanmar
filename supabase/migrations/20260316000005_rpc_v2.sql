-- Create a new version of the recommendation function to avoid any ambiguity issues
-- Renames parameter to p_viewer_id and prefix output columns with out_

CREATE OR REPLACE FUNCTION public.get_recommended_posts_v2(p_viewer_id UUID DEFAULT NULL)
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
BEGIN
    RETURN QUERY
    WITH engagement AS (
        SELECT 
            eng_p.id as eng_post_id,
            COUNT(DISTINCT eng_l.id) as eng_like_count,
            COUNT(DISTINCT eng_c.id) as eng_comment_count
        FROM public.posts eng_p
        LEFT JOIN public.likes eng_l ON eng_l.post_id = eng_p.id
        LEFT JOIN public.comments eng_c ON eng_c.post_id = eng_p.id
        GROUP BY eng_p.id
    ),
    seen_posts AS (
        SELECT s_p.post_id as s_seen_post_id
        FROM public.post_impressions s_p
        WHERE s_p.user_id = p_viewer_id AND p_viewer_id IS NOT NULL
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
            (COALESCE(e.eng_like_count, 0) * 10 + COALESCE(e.eng_comment_count, 0) * 5 + 1) * 
            POWER(0.8, EXTRACT(EPOCH FROM (now() - p.created_at)) / 86400) * 
            (CASE WHEN p.shop_id IS NOT NULL THEN 1.3 ELSE 1.0 END) * 
            (CASE WHEN s.s_seen_post_id IS NOT NULL THEN 0.1 ELSE 1.0 END)
        )::NUMERIC as out_score
    FROM public.posts p
    JOIN public.users u ON u.id = p.user_id
    LEFT JOIN engagement e ON e.eng_post_id = p.id
    LEFT JOIN seen_posts s ON s.s_seen_post_id = p.id
    ORDER BY out_score DESC, p.created_at DESC
    LIMIT 50;
END;
$$;
