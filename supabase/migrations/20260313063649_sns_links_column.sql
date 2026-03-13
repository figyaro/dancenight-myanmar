-- Add sns_links column to shops table
ALTER TABLE shops ADD COLUMN IF NOT EXISTS sns_links JSONB DEFAULT '{}';

-- Optional: Index for faster JSONB access if needed later
CREATE INDEX IF NOT EXISTS idx_shops_sns_links ON shops USING gin (sns_links);
