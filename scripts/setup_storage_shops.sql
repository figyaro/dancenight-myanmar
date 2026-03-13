-- Set up 'shops' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('shops', 'shops', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'shops' bucket
-- 1. Allow public to view images
CREATE POLICY "Public Access" ON storage.objects
    FOR SELECT USING (bucket_id = 'shops');

-- 2. Allow Shop Members to upload/manage their own shop images
-- Note: We use the folder name 'rooms/[shop_id]/...' to control access
CREATE POLICY "Shop Members can upload room images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'shops' AND
        (
            -- Check if folder name contains a shop_id that the user belongs to
            EXISTS (
                SELECT 1 FROM public.shop_members
                WHERE shop_id::text = (storage.foldername(name))[2]
                AND user_id = auth.uid()
            ) OR
            -- Allow Admins
            EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid()
                AND role IN ('admin', 'super admin')
            )
        )
    );

CREATE POLICY "Shop Members can update/delete room images" ON storage.objects
    FOR ALL USING (
        bucket_id = 'shops' AND
        (
            EXISTS (
                SELECT 1 FROM public.shop_members
                WHERE shop_id::text = (storage.foldername(name))[2]
                AND user_id = auth.uid()
            ) OR
            EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid()
                AND role IN ('admin', 'super admin')
            )
        )
    );
