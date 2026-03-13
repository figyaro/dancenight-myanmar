-- Update shop_rooms table with missing columns
ALTER TABLE public.shop_rooms ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.shop_rooms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.shop_rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure RLS is enabled
ALTER TABLE public.shop_rooms ENABLE ROW LEVEL SECURITY;

-- Policies (Re-create or ensure they exist)
DROP POLICY IF EXISTS "Anyone can view shop rooms" ON public.shop_rooms;
CREATE POLICY "Anyone can view shop rooms" ON public.shop_rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Shop members can manage rooms" ON public.shop_rooms;
CREATE POLICY "Shop members can manage rooms" ON public.shop_rooms FOR ALL USING (
    EXISTS (SELECT 1 FROM public.shop_members WHERE shop_id = public.shop_rooms.shop_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super admin'))
);

-- Trigger for updated_at (Assume update_updated_at_column exists from create_missing_tables.sql)
DROP TRIGGER IF EXISTS update_shop_rooms_updated_at ON public.shop_rooms;
CREATE TRIGGER update_shop_rooms_updated_at
    BEFORE UPDATE ON public.shop_rooms
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
