-- Add nickname column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'nickname') THEN
        ALTER TABLE public.users ADD COLUMN nickname TEXT;
    END IF;
END $$;

-- Policies for users table to allow admins to create shop accounts
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super admin', 'admin sales')
        )
    );

-- Also ensure admins can update users (e.g., to assign roles)
DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Admins can update users" ON public.users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super admin', 'admin sales')
        )
    );
