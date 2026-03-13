-- Add tags column to shop_rooms
ALTER TABLE public.shop_rooms ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Re-sync the select policy (though TRUE for SELECT usually covers all columns, good to be safe)
-- The existing policies already cover ALL columns for shop owners/admins.
