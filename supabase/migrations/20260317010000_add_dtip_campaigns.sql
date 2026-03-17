-- dtip Campaign and Quest System Extensions

-- 1. Create dtip_campaigns Table
CREATE TABLE IF NOT EXISTS public.dtip_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('bulk_gift', 'quest')),
    requirement_type TEXT CHECK (requirement_type IN ('post_count', 'manual')),
    requirement_value INTEGER DEFAULT 0,
    reward_amount BIGINT NOT NULL CHECK (reward_amount > 0),
    target_role TEXT, -- e.g., 'dancer', 'user', or NULL for all
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create user_campaign_progress Table (for quests)
CREATE TABLE IF NOT EXISTS public.user_campaign_progress (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.dtip_campaigns(id) ON DELETE CASCADE,
    current_value INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, campaign_id)
);

-- 3. Enable RLS
ALTER TABLE public.dtip_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_campaign_progress ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Admins can do everything
CREATE POLICY "Admins have full access to campaigns" 
ON public.dtip_campaigns FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'super admin')
    )
);

-- Users can view active campaigns
CREATE POLICY "Users can view active campaigns" 
ON public.dtip_campaigns FOR SELECT 
USING (status = 'active');

CREATE POLICY "Users can view their own campaign progress" 
ON public.user_campaign_progress FOR SELECT 
USING (auth.uid() = user_id);

-- 5. Automated Quest Completion Trigger Logic
-- This function updates progress when a user performs an action (e.g., posting)
CREATE OR REPLACE FUNCTION public.check_and_reward_dtip_quest()
RETURNS TRIGGER AS $$
DECLARE
    v_campaign RECORD;
    v_progress RECORD;
    v_success JSONB;
BEGIN
    -- Only handle 'quest' types for now
    -- We'll assume the action is 'post' if this is triggered from the posts table
    
    FOR v_campaign IN 
        SELECT * FROM public.dtip_campaigns 
        WHERE type = 'quest' 
        AND requirement_type = 'post_count' 
        AND status = 'active'
    LOOP
        -- Check if target_role matches user role (if specified)
        -- Note: We need the poster's role here
        -- INSERT INTO user_campaign_progress if not exists
        INSERT INTO public.user_campaign_progress (user_id, campaign_id, current_value)
        VALUES (NEW.user_id, v_campaign.id, 0)
        ON CONFLICT (user_id, campaign_id) DO NOTHING;

        -- Increment progress
        UPDATE public.user_campaign_progress
        SET current_value = current_value + 1,
            updated_at = now()
        WHERE user_id = NEW.user_id 
        AND campaign_id = v_campaign.id
        AND completed_at IS NULL
        RETURNING * INTO v_progress;

        -- Check if completed
        IF v_progress.current_value >= v_campaign.requirement_value THEN
            -- Mark as completed
            UPDATE public.user_campaign_progress
            SET completed_at = now()
            WHERE user_id = NEW.user_id AND campaign_id = v_campaign.id;

            -- Grant Reward via our secure atomic RPC
            -- Note: SECURITY DEFINER ensures this has permission to call process_dtip_transaction
            PERFORM public.process_dtip_transaction(
                NULL, -- Sender is system
                NEW.user_id,
                v_campaign.reward_amount,
                'reward',
                'campaign',
                v_campaign.id,
                jsonb_build_object('campaign_title', v_campaign.title)
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach Trigger to Posts Table
DROP TRIGGER IF EXISTS on_post_created_quest ON public.posts;
CREATE TRIGGER on_post_created_quest
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.check_and_reward_dtip_quest();

-- 7. Sync updated_at
CREATE OR REPLACE FUNCTION public.handle_dtip_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_dtip_campaign_updated_at
BEFORE UPDATE ON public.dtip_campaigns
FOR EACH ROW EXECUTE FUNCTION public.handle_dtip_updated_at();
