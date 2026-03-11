-- 1. Create a SECURITY DEFINER function to safely check admin role
-- This prevents infinite recursion because it bypasses RLS when checking roles.
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix RLS for users table to allow admins to create and manage users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile and others to view limited info (public)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.users;
CREATE POLICY "Public profiles are viewable by everyone" ON public.users FOR SELECT USING (true);

-- Allow admins to MANAGE all users using the secure function
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" ON public.users 
    FOR ALL 
    TO authenticated
    USING ( public.is_admin_user() )
    WITH CHECK ( public.is_admin_user() );

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
