-- Add shop_id to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;

-- Update RLS for events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Everyone can see events
CREATE POLICY "Events are viewable by everyone" ON public.events
    FOR SELECT USING (true);

-- Shops can manage their own events
CREATE POLICY "Shops can manage their own events" ON public.events
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM public.shop_members 
            WHERE shop_id = public.events.shop_id
        )
    );

-- Admins can manage everything
CREATE POLICY "Admins can manage all events" ON public.events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('admin', 'super admin')
        )
    );
