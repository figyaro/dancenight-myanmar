import { supabase } from './supabase';

/**
 * Standardized client-side media upload utility
 * Automatically routes through our backend API to handle Bunny.net uploads.
 */
export async function uploadMedia(file: File, folder: string = 'uploads'): Promise<{ url: string; error?: string }> {
    try {
        // 1. Get current session token for authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return { url: '', error: 'User session not found' };
        }

        // 2. Prepare FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        // Determine type based on mime type
        if (file.type.startsWith('video/')) {
            formData.append('type', 'video');
        } else {
            formData.append('type', 'image');
        }

        // 3. Call our unified upload API
        const response = await fetch('/api/media/upload', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error || 'Upload failed');
        }

        return { url: result.url };

    } catch (error: any) {
        console.error('Upload Utility Error:', error);
        return { url: '', error: error.message };
    }
}
