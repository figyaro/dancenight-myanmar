-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'user', 'dancer', 'shop'
    tier TEXT NOT NULL, -- 'Pro', 'Gold', 'Platinum', etc.
    price_monthly NUMERIC,
    price_yearly NUMERIC,
    price_custom NUMERIC,
    features JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Admins can manage plans" ON public.plans FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Create subscriptions/active_plans table
CREATE TABLE IF NOT EXISTS public.active_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID NOT NULL, -- user_id, dancer_id, or shop_id
    plan_id UUID REFERENCES public.plans(id),
    billing_cycle TEXT NOT NULL, -- 'monthly', 'yearly', 'custom'
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.active_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own active plans" ON public.active_plans FOR SELECT USING (
    auth.uid() = target_id OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Seed initial plans
INSERT INTO public.plans (name, type, tier, price_monthly, price_yearly) VALUES
('User Pro', 'user', 'Pro', 10, 100),
('User Gold', 'user', 'Gold', 25, 250),
('User Platinum', 'user', 'Platinum', 50, 500),
('Dancer Pro', 'dancer', 'Pro', 15, 150),
('Shop Pro Pack', 'shop', 'Pro', 100, 1000),
('Club Pack', 'shop', 'Club', 200, 2000),
('KTV Pack', 'shop', 'KTV', 150, 1500),
('Restaurant&Bar Pack', 'shop', 'RestoBar', 80, 800)
ON CONFLICT DO NOTHING;
