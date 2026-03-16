-- Ensure unique constraints to prevent double-counting
ALTER TABLE IF EXISTS public.follows DROP CONSTRAINT IF EXISTS follows_follower_id_following_id_key;
ALTER TABLE IF EXISTS public.follows ADD CONSTRAINT follows_follower_id_following_id_key UNIQUE (follower_id, following_id);

ALTER TABLE IF EXISTS public.likes DROP CONSTRAINT IF EXISTS likes_user_id_post_id_key;
ALTER TABLE IF EXISTS public.likes ADD CONSTRAINT likes_user_id_post_id_key UNIQUE (user_id, post_id);

-- Enable RLS and set policies
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public follows are viewable by everyone" ON public.follows;
CREATE POLICY "Public follows are viewable by everyone" ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow others" ON public.follows;
CREATE POLICY "Users can unfollow others" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Public likes are viewable by everyone" ON public.likes;
CREATE POLICY "Public likes are viewable by everyone" ON public.likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can like posts" ON public.likes;
CREATE POLICY "Users can like posts" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unlike posts" ON public.likes;
CREATE POLICY "Users can unlike posts" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions to RPCs
GRANT EXECUTE ON FUNCTION public.get_user_comprehensive_stats(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_with_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_post_counts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_follow_stats() TO anon, authenticated;
