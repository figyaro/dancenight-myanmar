import { supabase } from './supabase';

/**
 * Standardized client-side media upload utility
 * Automatically routes through our backend API to handle Bunny.net uploads.
 */
export async function uploadMedia(
    file: File, 
    folder: string = 'uploads',
    onProgress?: (progress: number) => void
): Promise<{ url: string; mediaId?: string; error?: string }> {
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

        // 3. Call our unified upload API using XHR for progress tracking
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/media/upload');
            xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);

            if (onProgress) {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        onProgress(percentComplete);
                    }
                };
            }

            xhr.onload = () => {
                const result = JSON.parse(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300 && result.success) {
                    resolve({ url: result.url, mediaId: result.mediaId });
                } else {
                    resolve({ url: '', error: result.error || 'Upload failed' });
                }
            };

            xhr.onerror = () => {
                resolve({ url: '', error: 'Network error during upload' });
            };

            xhr.send(formData);
        });

    } catch (error: any) {
        console.error('Upload Utility Error:', error);
        return { url: '', error: error.message };
    }
}

