-- Migration to fix plan deletion error by allowing ON DELETE SET NULL

-- 1. Update shops table constraint
ALTER TABLE public.shops 
DROP CONSTRAINT IF EXISTS shops_plan_id_fkey;

ALTER TABLE public.shops
ADD CONSTRAINT shops_plan_id_fkey 
FOREIGN KEY (plan_id) 
REFERENCES public.plans(id) 
ON DELETE SET NULL;

-- 2. Update active_plans table constraint
ALTER TABLE public.active_plans 
DROP CONSTRAINT IF EXISTS active_plans_plan_id_fkey;

ALTER TABLE public.active_plans
ADD CONSTRAINT active_plans_plan_id_fkey 
FOREIGN KEY (plan_id) 
REFERENCES public.plans(id) 
ON DELETE SET NULL;
