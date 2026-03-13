-- Broaden the "Admins can manage plans" policy to include 'super admin'
DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;

CREATE POLICY "Admins can manage plans" ON public.plans 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR role = 'super admin')
    )
);

-- Also update active_plans for good measure
DROP POLICY IF EXISTS "Users can view their own active plans" ON public.active_plans;

CREATE POLICY "Users can view their own active plans" ON public.active_plans 
FOR SELECT 
USING (
    auth.uid() = target_id OR 
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND (role = 'admin' OR role = 'super admin')
    )
);
