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
    
    // 1. Extract video ID and library ID
    let videoId = '';
    let libraryId = '';

    // Standard player: https://iframe.mediadelivery.net/play/{libraryId}/{videoId}
    const playerMatch = url.match(/\/play\/(\d+)\/([a-z0-9-]+)/i);
    // Direct internal: https://video.bunnycdn.com/library/{libraryId}/videos/{videoId}/...
    const libraryMatch = url.match(/\/library\/(\d+)\/videos\/([a-z0-9-]+)/i);
    // Bare GUID: 9c0c75d8-448f-4517-8d96-8f43be17412d
    const idOnlyMatch = url.match(/^([a-z0-9-]{36})$/i);

    if (playerMatch) {
        libraryId = playerMatch[1];
        videoId = playerMatch[2];
    } else if (libraryMatch) {
        libraryId = libraryMatch[1];
        videoId = libraryMatch[2];
    } else if (idOnlyMatch) {
        videoId = idOnlyMatch[1];
    } else {
        // Fallback: search for any GUID-like pattern
        const guidMatch = url.match(/([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})/i);
        if (guidMatch) videoId = guidMatch[1];
    }
    
    if (!videoId) return url;
    
    // Use PULL_ZONE if available
    // Format: https://{pullzone}.b-cdn.net/{videoId}/play_720p.mp4
    if (PULL_ZONE && !PULL_ZONE.includes('undefined')) {
        const base = PULL_ZONE.replace(/\/$/, '');
        // We try play_720p.mp4 first as it is the standard for most modern Bunny libraries
        return `${base}/${videoId}/play_720p.mp4`;
    }
    
    // If no pull zone, we can't easily construct a direct MP4 link without the pull zone hostname.
    // Return the original URL (likely an iframe or library URL)
    return url;
}

/**
 * Transforms a Bunny Stream player or direct link into the official player embed URL
 * Format: https://player.mediadelivery.net/embed/{libraryId}/{videoId}
 */
export function getBunnyStreamEmbedUrl(url: string | null): string | null {
    if (!url) return null;
    
    let videoId = '';
    let libraryId = (process.env.BUNNY_STREAM_LIBRARY_ID || '').toString();

    // 1. Extract IDs from various formats
    // Standard player: https://iframe.mediadelivery.net/play/{libraryId}/{videoId}
    const playerMatch = url.match(/\/play\/(\d+)\/([a-z0-9-]+)/i);
    // Direct internal: https://video.bunnycdn.com/library/{libraryId}/videos/{videoId}/...
    const libraryMatch = url.match(/\/library\/(\d+)\/videos\/([a-z0-9-]+)/i);
    // Already an embed: https://player.mediadelivery.net/embed/{libraryId}/{videoId}
    const embedMatch = url.match(/\/embed\/(\d+)\/([a-z0-9-]+)/i);
    
    if (playerMatch) {
        libraryId = playerMatch[1];
        videoId = playerMatch[2];
    } else if (libraryMatch) {
        libraryId = libraryMatch[1];
        videoId = libraryMatch[2];
    } else if (embedMatch) {
        libraryId = embedMatch[1];
        videoId = embedMatch[2];
    } else {
        // Fallback: check if it's just a GUID
        const guidMatch = url.match(/^([a-z0-9-]{36})$/i);
        if (guidMatch) {
            videoId = guidMatch[1];
        } else {
            const guidInPathMatch = url.match(/([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})/i);
            if (guidInPathMatch) videoId = guidInPathMatch[1];
        }
    }

    if (!videoId || !libraryId) return url;

    // Return the modern embed URL with autoplay and muted for better mobile support
    return `https://player.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=true&muted=true&preload=true&loop=true`;
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
