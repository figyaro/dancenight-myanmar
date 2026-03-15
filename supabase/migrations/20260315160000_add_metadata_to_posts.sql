-- Add file_size column to posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Add comment explaining the column
COMMENT ON COLUMN public.posts.file_size IS 'Size of the media file in bytes';
