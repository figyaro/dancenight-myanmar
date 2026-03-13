-- Create room_reservations table
CREATE TABLE IF NOT EXISTS public.room_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.shop_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.room_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- 1. Users can view their own reservations
CREATE POLICY "Users can view own reservations" ON public.room_reservations
    FOR SELECT USING (auth.uid() = user_id);

-- 2. Users can create their own reservations
CREATE POLICY "Users can create own reservations" ON public.room_reservations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Shop Members can view reservations for their shop's rooms
CREATE POLICY "Shop Members can view shop reservations" ON public.room_reservations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.shop_rooms r
            JOIN public.shop_members m ON r.shop_id = m.shop_id
            WHERE r.id = room_reservations.room_id
            AND m.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super admin')
        )
    );

-- 4. Shop Members can update reservations for their shop's rooms (confirm/cancel/etc)
CREATE POLICY "Shop Members can update shop reservations" ON public.room_reservations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.shop_rooms r
            JOIN public.shop_members m ON r.shop_id = m.shop_id
            WHERE r.id = room_reservations.room_id
            AND m.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super admin')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shop_rooms r
            JOIN public.shop_members m ON r.shop_id = m.shop_id
            WHERE r.id = room_reservations.room_id
            AND m.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super admin')
        )
    );

-- Trigger for updated_at
CREATE TRIGGER update_room_reservations_updated_at
    BEFORE UPDATE ON public.room_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
