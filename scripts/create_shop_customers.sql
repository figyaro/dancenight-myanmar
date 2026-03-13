-- Create shop_customers table
CREATE TABLE IF NOT EXISTS public.shop_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    notes TEXT,
    last_visit TIMESTAMPTZ DEFAULT now(),
    total_visits INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(shop_id, user_id)
);

-- Enable RLS
ALTER TABLE public.shop_customers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Shop owners/staff can view their customers" ON public.shop_customers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.shop_members m
            WHERE m.shop_id = shop_customers.shop_id
            AND m.user_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super admin'))
    );

CREATE POLICY "Shop owners/staff can update customer notes" ON public.shop_customers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.shop_members m
            WHERE m.shop_id = shop_customers.shop_id
            AND m.user_id = auth.uid()
        ) OR
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super admin'))
    );

-- Automation Trigger: Sync reservation to customer
CREATE OR REPLACE FUNCTION public.sync_reservation_to_customer()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.shop_customers (shop_id, user_id, last_visit, total_visits)
    SELECT r.shop_id, NEW.user_id, NEW.start_time, 1
    FROM public.shop_rooms r
    WHERE r.id = NEW.room_id
    ON CONFLICT (shop_id, user_id) DO UPDATE SET
        last_visit = GREATEST(shop_customers.last_visit, EXCLUDED.last_visit),
        total_visits = shop_customers.total_visits + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_reservation_created ON public.room_reservations;
CREATE TRIGGER on_reservation_created
    AFTER INSERT ON public.room_reservations
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_reservation_to_customer();
