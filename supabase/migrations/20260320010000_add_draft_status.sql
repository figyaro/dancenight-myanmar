-- Update sns_posts status constraint to allow draft and approved
DO $$
BEGIN
    ALTER TABLE public.sns_posts DROP CONSTRAINT IF EXISTS sns_posts_status_check;
EXCEPTION
    WHEN undefined_object THEN
        -- Do nothing if constraint doesn't exist
        NULL;
END $$;

ALTER TABLE public.sns_posts ADD CONSTRAINT sns_posts_status_check 
  CHECK (status in ('draft', 'approved', 'pending', 'posted', 'failed', 'generating', 'rejected'));

-- Update any existing pending posts to draft so they require approval before posting
UPDATE public.sns_posts SET status = 'draft' WHERE status = 'pending';
