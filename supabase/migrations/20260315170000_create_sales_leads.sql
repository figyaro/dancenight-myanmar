-- Create sales_leads table
CREATE TABLE IF NOT EXISTS public.sales_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- CLUB, KTV, RESTAURANT, BAR, SPA, Massage, others
    address TEXT,
    phone TEXT,
    website TEXT,
    google_place_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'Prospect', -- Prospect, Contacted, Negotiating, Won, Lost
    sales_rep_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    acquired_shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sales_leads ENABLE ROW LEVEL SECURITY;

-- Policies for sales_leads
DROP POLICY IF EXISTS "Sales leads are viewable by admins" ON public.sales_leads;
CREATE POLICY "Sales leads are viewable by admins" ON public.sales_leads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super admin', 'admin sales')
        )
    );

DROP POLICY IF EXISTS "Sales leads are manageable by admins" ON public.sales_leads;
CREATE POLICY "Sales leads are manageable by admins" ON public.sales_leads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super admin', 'admin sales')
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_sales_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sales_leads_updated_at_trigger
    BEFORE UPDATE ON public.sales_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_leads_updated_at();
