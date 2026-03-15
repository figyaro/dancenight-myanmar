-- Create post_impressions table
CREATE TABLE IF NOT EXISTS public.post_impressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.post_impressions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own impressions" ON public.post_impressions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own impressions" ON public.post_impressions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS post_impressions_user_id_idx ON public.post_impressions (user_id);
CREATE INDEX IF NOT EXISTS post_impressions_post_id_idx ON public.post_impressions (post_id);
