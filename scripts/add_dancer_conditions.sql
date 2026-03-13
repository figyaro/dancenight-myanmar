-- Add conditions columns to public.dancers table
ALTER TABLE public.dancers 
ADD COLUMN IF NOT EXISTS availability_info TEXT,
ADD COLUMN IF NOT EXISTS price_info TEXT,
ADD COLUMN IF NOT EXISTS place_info TEXT,
ADD COLUMN IF NOT EXISTS comment TEXT,
ADD COLUMN IF NOT EXISTS condition_tags TEXT[];

-- Update RLS to ensure dancers can update their own conditions
DROP POLICY IF EXISTS "Dancers can update their own profile" ON public.dancers;
CREATE POLICY "Dancers can update their own profile" ON public.dancers
    FOR UPDATE USING (auth.uid() = user_id);

-- Ensure insert is also possible for the user themselves
DROP POLICY IF EXISTS "Dancers can insert their own profile" ON public.dancers;
CREATE POLICY "Dancers can insert their own profile" ON public.dancers
    FOR INSERT WITH CHECK (auth.uid() = user_id);
