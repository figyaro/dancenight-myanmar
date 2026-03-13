-- Add permissions and status columns to shop_members
ALTER TABLE shop_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE shop_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add comment for clarity
COMMENT ON COLUMN shop_members.permissions IS 'List of menu IDs or specific feature keys the member can access';
COMMENT ON COLUMN shop_members.status IS 'Status of the membership (e.g., active, pending, invited)';
