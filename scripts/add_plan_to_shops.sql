-- 1. Ensure 'Shop Free' plan exists in plans table
INSERT INTO public.plans (name, type, tier, price_monthly, price_yearly, features)
VALUES ('Shop Free', 'shop', 'Free', 0, 0, '["Basic listing", "Standard support"]')
ON CONFLICT (id) DO NOTHING; -- Plan ID might be dynamic, so we usually check by name/type/tier in logic

-- 2. Add plan_id column to shops table
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id);

-- 3. Set all existing shops to 'Shop Free' plan
-- We first find the ID of the 'Shop Free' plan we just ensured exists
DO $$
DECLARE
    free_plan_id UUID;
BEGIN
    SELECT id INTO free_plan_id FROM public.plans WHERE name = 'Shop Free' AND type = 'shop' LIMIT 1;
    
    IF free_plan_id IS NULL THEN
        -- If it wasn't there (shouldn't happen with step 1), create it and get ID
        INSERT INTO public.plans (name, type, tier, price_monthly, price_yearly, features)
        VALUES ('Shop Free', 'shop', 'Free', 0, 0, '["Basic listing", "Standard support"]')
        RETURNING id INTO free_plan_id;
    END IF;

    UPDATE public.shops SET plan_id = free_plan_id WHERE plan_id IS NULL;
END $$;
