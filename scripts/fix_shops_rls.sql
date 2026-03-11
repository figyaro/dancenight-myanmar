-- Fix RLS for shops table to allow admin updates
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view shops (standard)
DROP POLICY IF EXISTS "Anyone can view shops" ON public.shops;
CREATE POLICY "Anyone can view shops" ON public.shops FOR SELECT USING (true);

-- Allow admins to manage (all operations) using the secure function
DROP POLICY IF EXISTS "Admins can manage shops" ON public.shops;
CREATE POLICY "Admins can manage shops" ON public.shops 
    FOR ALL 
    USING ( public.is_admin_user() );

-- Allow shop owners/members to update their own shop
DROP POLICY IF EXISTS "Shop members can update their shop" ON public.shops;
CREATE POLICY "Shop members can update their shop" ON public.shops FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.shop_members 
        WHERE shop_id = public.shops.id AND user_id = auth.uid() AND (role = 'owner' OR role = 'manager')
    )
);
