-- Add category and ownership support to shops
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS category TEXT; -- 'Club', 'KTV', 'Restaurant', etc.
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS tags TEXT[]; -- Optional multiple tags

-- Create shop_members table for access control
CREATE TABLE IF NOT EXISTS public.shop_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'staff', -- 'owner', 'manager', 'staff'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(shop_id, user_id)
);

-- Enable RLS for shop_members
ALTER TABLE public.shop_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memberships" ON public.shop_members 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all memberships" ON public.shop_members 
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Add shop_id to posts for shop-specific content
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL;

-- Update posts RLS to allow shop members to manage shop posts
-- (Assuming posts already has RLS, we'll need to adjust it)
-- For now, adding a simple policy for shop post management
CREATE POLICY "Shop members can manage shop posts" ON public.posts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.shop_members 
            WHERE shop_id = public.posts.shop_id AND user_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
    );

-- Add DJ and Room management tables (as requested by specific menu items)
CREATE TABLE IF NOT EXISTS public.shop_staff ( -- For DJ, Floor staff, etc.
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT, -- 'DJ', 'Performer'
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shop_staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view shop staff" ON public.shop_staff FOR SELECT USING (true);
CREATE POLICY "Shop members can manage staff" ON public.shop_staff FOR ALL USING (
    EXISTS (SELECT 1 FROM public.shop_members WHERE shop_id = public.shop_staff.shop_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE TABLE IF NOT EXISTS public.shop_rooms ( -- For KTV, VIP rooms
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity INT,
    price_per_hour NUMERIC,
    status TEXT DEFAULT 'available',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shop_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view shop rooms" ON public.shop_rooms FOR SELECT USING (true);
CREATE POLICY "Shop members can manage rooms" ON public.shop_rooms FOR ALL USING (
    EXISTS (SELECT 1 FROM public.shop_members WHERE shop_id = public.shop_rooms.shop_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE TABLE IF NOT EXISTS public.shop_menu_items ( -- For Restaurants
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC,
    category TEXT, -- 'Drink', 'Food', 'Course'
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shop_menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view menu items" ON public.shop_menu_items FOR SELECT USING (true);
CREATE POLICY "Shop members can manage menu" ON public.shop_menu_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.shop_members WHERE shop_id = public.shop_menu_items.shop_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
