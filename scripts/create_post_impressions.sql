-- Create post_impressions table
CREATE TABLE IF NOT EXISTS public.post_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE public.post_impressions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own impressions
CREATE POLICY "Users can view own impressions" ON public.post_impressions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own impressions
CREATE POLICY "Users can insert own impressions" ON public.post_impressions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS post_impressions_user_id_idx ON public.post_impressions (user_id);
CREATE INDEX IF NOT EXISTS post_impressions_post_id_idx ON public.post_impressions (post_id);
