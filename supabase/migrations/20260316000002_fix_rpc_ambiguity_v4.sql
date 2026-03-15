-- Fix get_recommended_posts ambiguity once and for all
CREATE OR REPLACE FUNCTION public.get_recommended_posts(p_user_id UUID DEFAULT NULL)
RETURNS SETOF posts
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
#variable_conflict use_column
BEGIN
    RETURN QUERY
    WITH seen_posts AS (
        SELECT pi."post_id"
        FROM public.post_impressions pi
        WHERE pi."user_id" = p_user_id
    )
    SELECT p.*
    FROM public.posts p
    LEFT JOIN seen_posts sp ON p."id" = sp."post_id"
    WHERE sp."post_id" IS NULL
    ORDER BY p."created_at" DESC
    LIMIT 20;
END;
$$;
