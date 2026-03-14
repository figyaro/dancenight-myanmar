import { NextRequest, NextResponse } from 'next/server';
import { uploadToBunnyStorage, uploadToBunnyStream } from '../../../../lib/bunny';
import { supabase } from '../../../../lib/supabase';

/**
 * API Route: POST /api/media/upload
 * Handles media uploads to Bunny.net (Storage for images, Stream for videos).
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Authenticate user via Supabase
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Auth header missing' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse FormData
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string; // 'image' or 'video'
        const folder = formData.get('folder') as string || 'uploads';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // 3. Handle upload based on type
        let result;
        if (type === 'video' || file.type.startsWith('video/')) {
            // Upload to Bunny Stream
            result = await uploadToBunnyStream(file, file.name);
        } else {
            // Upload to Bunny Storage (Images/Files)
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            result = await uploadToBunnyStorage(file, fileName, folder);
        }

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }

        return NextResponse.json({
            url: result.url,
            mediaId: result.mediaId,
            success: true
        });

    } catch (error: any) {
        console.error('API Media Upload Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
