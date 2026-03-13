-- Create analytics_events table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'shop_impression', 'post_impression', 'map_view', 'action_click', 'reservation_click', 'sns_click', 'post_click'
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins can view their own shop analytics" ON public.analytics_events;
CREATE POLICY "Admins can view their own shop analytics" ON public.analytics_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM shop_members
            WHERE shop_members.shop_id = analytics_events.shop_id
            AND shop_members.user_id = auth.uid()
        ) OR (
            SELECT role FROM users WHERE id = auth.uid()
        ) = 'super admin'
    );

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics events" ON public.analytics_events
    FOR INSERT WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_analytics_shop_date ON public.analytics_events(shop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_post_date ON public.analytics_events(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_events(event_type);
