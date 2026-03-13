-- Fix RLS for posts to ensure shop members and admins can insert/update/delete
-- We use SECURITY DEFINER for a helper function to avoid RLS recursion or permission issues if needed,
-- but standard EXISTS should work if policies are correct.

-- Update the is_admin function to be more robust (case-insensitive)
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND lower(role) IN ('admin', 'super admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comprehensive policy for posts
DROP POLICY IF EXISTS "Shop members can manage shop posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.posts;
DROP POLICY IF EXISTS "Users can manage their own posts" ON public.posts;

-- Allow anyone to view posts (or adjust if posts should be private)
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
CREATE POLICY "Anyone can view posts" ON public.posts
    FOR SELECT USING (true);

-- Allow users to manage their own posts
CREATE POLICY "Users can manage their own posts" ON public.posts
    FOR ALL USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow admins to manage all posts
CREATE POLICY "Admins can manage all posts" ON public.posts
    FOR ALL 
    USING (is_admin())
    WITH CHECK (is_admin());

-- Allow shop members to manage posts for their shop
-- Note: This explicitly allows inserting if the auth user is a member of the shop being posted to.
CREATE POLICY "Shop members can manage shop posts" ON public.posts
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.shop_members 
            WHERE shop_id = public.posts.shop_id AND user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.shop_members 
            WHERE shop_id = public.posts.shop_id AND user_id = auth.uid()
        )
    );
