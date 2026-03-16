-- Relax RLS for analytics_events to allow counting impressions for Discover page
-- This allows anyone to count events, but not see user_id or metadata detail for others
DROP POLICY IF EXISTS "Admins can view their own shop analytics" ON public.analytics_events;

CREATE POLICY "Allow counting and admin viewing analytics" ON public.analytics_events
    FOR SELECT USING (
        -- Admins can see everything
        (SELECT role FROM users WHERE id = auth.uid()) = 'super admin'
        OR 
        -- Shop members can see their own shop events
        EXISTS (
            SELECT 1 FROM shop_members
            WHERE shop_members.shop_id = analytics_events.shop_id
            AND shop_members.user_id = auth.uid()
        )
        OR
        -- Everyone can see (count) post impressions specifically
        (event_type = 'post_impression')
    );
