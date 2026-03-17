-- Initialize a Demo Quest Campaign
INSERT INTO public.dtip_campaigns (title, description, type, requirement_type, requirement_value, reward_amount, status)
VALUES (
    'Video Master Quest', 
    'Post 10 videos to receive a special dtip bonus!', 
    'quest', 
    'post_count', 
    10, 
    5000, 
    'active'
);

-- Initialize a Bulk Gift Campaign (Draft)
INSERT INTO public.dtip_campaigns (title, description, type, reward_amount, target_role, status)
VALUES (
    'Dancer Appreciation Month', 
    'A special gift for all our hard-working dancers.', 
    'bulk_gift', 
    1000, 
    'dancer', 
    'draft'
);
