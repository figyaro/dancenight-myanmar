import { supabase } from './supabase';

/**
 * Bunny.net Integration Configuration
 * Note: These should be set in .env.local for development and in DO/Vercel for production.
 */
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY;
const BUNNY_STORAGE_ZONE_NAME = process.env.BUNNY_STORAGE_ZONE_NAME;
const BUNNY_STORAGE_REGION = process.env.BUNNY_STORAGE_REGION || 'storage'; // default to German storage
const PULL_ZONE = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL || 'https://dancetgt.b-cdn.net';

const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY;
const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID;

interface UploadResponse {
    url: string;
    success: boolean;
    error?: string;
    mediaId?: string; // For Bunny Stream
}

/**
 * Uploads an image to Bunny Storage
 */
export async function uploadToBunnyStorage(file: Buffer | File, fileName: string, folder: string = 'images'): Promise<UploadResponse> {
    if (!BUNNY_STORAGE_API_KEY || !BUNNY_STORAGE_ZONE_NAME || !PULL_ZONE || PULL_ZONE.includes('undefined')) {
        return { 
            success: false, 
            url: '', 
            error: 'Bunny.net Storage configuration missing. (Check NEXT_PUBLIC_BUNNY_PULL_ZONE_URL)' 
        };
    }

    const path = `${folder}/${fileName}`;
    const url = `https://${BUNNY_STORAGE_REGION}.bunnycdn.com/${BUNNY_STORAGE_ZONE_NAME}/${path}`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                AccessKey: BUNNY_STORAGE_API_KEY,
                'Content-Type': 'application/octet-stream',
            },
            body: file as any,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Bunny.net API Error: ${errorText}`);
        }

        return {
            success: true,
            url: `${PULL_ZONE}/${path}`,
        };
    } catch (error: any) {
        console.error('Error uploading to Bunny Storage:', error);
        return { success: false, url: '', error: error.message };
    }
}

/**
 * Checks if a URL is a Bunny Stream URL
 */
export function isBunnyStream(url: string | null): boolean {
    if (!url) return false;
    return url.includes('iframe.mediadelivery.net') || url.includes('video.bunnycdn.com');
}

export const isVideo = (url: string | null) => {
    if (!url) return false;
    // Check if it's a direct video link or a Bunny Stream iframe link
    return url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) !== null || isBunnyStream(url);
};

/**
 * Transforms a Bunny Stream player URL into a direct video URL (MP4 fallback)
 * Note: Requires "Direct File Access" to be enabled in Bunny Stream Settings.
 * Format: https://{pullzone}.b-cdn.net/{videoId}/play.720p.mp4
 */
export function getBunnyStreamVideoUrl(url: string | null): string | null {
    if (!url || !isBunnyStream(url)) return url;
    
    // Extract library ID and video ID from standard player URL
    // https://iframe.mediadelivery.net/play/{libraryId}/{videoId}
    const match = url.match(/\/play\/(\d+)\/([a-z0-9-]+)/i);
    if (!match) return url;
    
    const libraryId = match[1];
    const videoId = match[2];
    
    // Default to library-specific direct access URL if no pull zone is specified
    return `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}/play.720p.mp4`;
}

/**
 * Uploads a video to Bunny Stream
 * Note: This involves creating a video entry and then uploading the content.
 */
export async function uploadToBunnyStream(file: Buffer | File, title: string): Promise<UploadResponse> {
    if (!BUNNY_STREAM_API_KEY || !BUNNY_STREAM_LIBRARY_ID) {
        return { success: false, url: '', error: 'Bunny.net Stream configuration missing.' };
    }

    try {
        // 1. Create the video entry
        const createUrl = `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos`;
        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
                AccessKey: BUNNY_STREAM_API_KEY,
                'Content-Type': 'application/json',
                accept: 'application/json',
            },
            body: JSON.stringify({ title }),
        });

        const videoData = await createResponse.json();
        if (!videoData.guid) throw new Error('Failed to create video entry in Bunny Stream');

        const videoId = videoData.guid;

        // 2. Upload the video content
        const uploadUrl = `https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`;
        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                AccessKey: BUNNY_STREAM_API_KEY,
            },
            body: file as any,
        });

        if (!uploadResponse.ok) throw new Error('Failed to upload video content to Bunny Stream');

        return {
            success: true,
            url: `https://iframe.mediadelivery.net/play/${BUNNY_STREAM_LIBRARY_ID}/${videoId}`, // Standard player URL
            mediaId: videoId,
        };
    } catch (error: any) {
        console.error('Error uploading to Bunny Stream:', error);
        return { success: false, url: '', error: error.message };
    }
}
