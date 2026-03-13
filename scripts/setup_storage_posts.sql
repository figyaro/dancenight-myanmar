-- Set up 'posts' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to view posts media
DROP POLICY IF EXISTS "Public Access to Posts" ON storage.objects;
CREATE POLICY "Public Access to Posts" ON storage.objects
    FOR SELECT USING (bucket_id = 'posts');

-- Allow authenticated users to upload to posts
-- We'll allow any shop member or admin to upload
DROP POLICY IF EXISTS "Authenticated users can upload posts media" ON storage.objects;
CREATE POLICY "Authenticated users can upload posts media" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'posts' AND
        (
            -- Allow shop members (we can't easily check shop_id from fileName here without a convention, 
            -- so we'll allow any authenticated user for now, or check if they are an admin)
            auth.role() = 'authenticated'
        )
    );

-- Allow users to manage their own uploads in posts
DROP POLICY IF EXISTS "Users can manage their own posts media" ON storage.objects;
CREATE POLICY "Users can manage their own posts media" ON storage.objects
    FOR ALL USING (
        bucket_id = 'posts' AND
        (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
    );

-- Note: is_admin() should already be defined from previous scripts.
-- If not, ensure it exists.
