-- Create function to get recommended posts
CREATE OR REPLACE FUNCTION public.get_recommended_posts(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    area TEXT,
    name TEXT,
    title TEXT,
    price_per_hour NUMERIC,
    currency TEXT,
    rating NUMERIC,
    main_image_url TEXT,
    location_name TEXT,
    shop_id UUID,
    created_at TIMESTAMPTZ,
    users JSONB,
    score NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH engagement AS (
        SELECT 
            p.id as post_id,
            COUNT(DISTINCT l.id) as like_count,
            COUNT(DISTINCT c.id) as comment_count
        FROM public.posts p
        LEFT JOIN public.likes l ON l.post_id = p.id
        LEFT JOIN public.comments c ON c.post_id = p.id
        GROUP BY p.id
    ),
    seen_posts AS (
        SELECT post_id 
        FROM public.post_impressions 
        WHERE user_id = p_user_id
    )
    SELECT 
        p.id,
        p.user_id,
        p.area,
        p.name,
        p.title,
        p.price_per_hour,
        p.currency,
        p.rating,
        p.main_image_url,
        p.location_name,
        p.shop_id,
        p.created_at,
        jsonb_build_object(
            'nickname', u.nickname,
            'avatar_url', u.avatar_url,
            'role', u.role
        ) as users,
        (
            -- Scoring Logic
            (COALESCE(e.like_count, 0) * 10 + COALESCE(e.comment_count, 0) * 5 + 1) * -- Engagement
            POWER(0.8, EXTRACT(EPOCH FROM (now() - p.created_at)) / 86400) * -- Time Decay (20% drop per day)
            (CASE WHEN p.shop_id IS NOT NULL THEN 1.3 ELSE 1.0 END) * -- Shop Boost
            (CASE WHEN s.post_id IS NOT NULL THEN 0.1 ELSE 1.0 END) -- Seen Penalty
        )::NUMERIC as score
    FROM public.posts p
    JOIN public.users u ON u.id = p.user_id
    LEFT JOIN engagement e ON e.post_id = p.id
    LEFT JOIN seen_posts s ON s.post_id = p.id
    ORDER BY score DESC, p.created_at DESC
    LIMIT 50;
END;
$$;
