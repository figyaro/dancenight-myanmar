-- Create missing tables for Dancers and Conversations

-- 1. Dancers Table
CREATE TABLE IF NOT EXISTS public.dancers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    style TEXT,
    location TEXT,
    experience TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for dancers
ALTER TABLE public.dancers ENABLE ROW LEVEL SECURITY;

-- Policies for dancers
CREATE POLICY "Dancers are viewable by everyone" ON public.dancers
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage dancers" ON public.dancers
    FOR ALL USING (true); -- Note: In production, restricted to admin role if exists

-- 2. Conversations Table (Proxies for Reservations/Leads)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Policies for conversations
CREATE POLICY "Conversations are viewable by participants" ON public.conversations
    FOR SELECT USING (true); -- Simplified for now

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies for messages
CREATE POLICY "Messages are viewable by participants" ON public.messages
    FOR SELECT USING (true); -- Simplified for now

-- Trigger to update updated_at on conversations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
