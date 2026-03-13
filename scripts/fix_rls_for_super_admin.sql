-- Consolidated Fix for RLS (Super Admin support) and Plan Deletion (409 Conflict)

-- 1. Create a unified, secure admin check function
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also update the old function name for backward compatibility if used in existing policies
CREATE OR REPLACE FUNCTION public.is_admin_user() 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update Users Table RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
CREATE POLICY "Admins can manage all users" ON public.users 
    FOR ALL USING (public.is_admin());

-- 3. Update Shops Table RLS
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage shops" ON public.shops;
CREATE POLICY "Admins can manage shops" ON public.shops 
    FOR ALL USING (public.is_admin());

-- 4. Update Plans Table RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
CREATE POLICY "Admins can manage plans" ON public.plans 
    FOR ALL USING (public.is_admin());

-- 5. Update Active Plans Table RLS
ALTER TABLE public.active_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage active plans" ON public.active_plans;
CREATE POLICY "Admins can manage active plans" ON public.active_plans 
    FOR ALL USING (public.is_admin());

-- 6. Resolve 409 Conflict on Plan Deletion (Foreign Key Fix)
-- Ensure shops and active_plans don't block plan deletion
ALTER TABLE public.shops 
DROP CONSTRAINT IF EXISTS shops_plan_id_fkey;

ALTER TABLE public.shops
ADD CONSTRAINT shops_plan_id_fkey 
FOREIGN KEY (plan_id) REFERENCES public.plans(id) 
ON DELETE SET NULL;

ALTER TABLE public.active_plans 
DROP CONSTRAINT IF EXISTS active_plans_plan_id_fkey;

ALTER TABLE public.active_plans
ADD CONSTRAINT active_plans_plan_id_fkey 
FOREIGN KEY (plan_id) REFERENCES public.plans(id) 
ON DELETE SET NULL;
