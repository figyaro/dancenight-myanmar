-- Update RLS policies to allow Admins and Super Admins to manage all content

-- Function to check if the current authenticated user is an admin or super admin
CREATE OR REPLACE FUNCTION is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Dancers Table Policies
DROP POLICY IF EXISTS "Admins can manage dancers" ON public.dancers;
CREATE POLICY "Admins can manage dancers" ON public.dancers
    FOR ALL USING (is_admin());

-- 2. Users Table Policies (to allow updating roles/profiles)
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" ON public.users
    FOR ALL USING (is_admin());

-- 3. Posts Table Policies
DROP POLICY IF EXISTS "Admins can manage all posts" ON public.posts;
CREATE POLICY "Admins can manage all posts" ON public.posts
    FOR ALL USING (is_admin());

-- 4. Follows Table Policies (if needed for impersonation)
DROP POLICY IF EXISTS "Admins can manage all follows" ON public.follows;
CREATE POLICY "Admins can manage all follows" ON public.follows
    FOR ALL USING (is_admin());
