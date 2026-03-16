import { supabase } from './supabase';

/**
 * Bunny.net Integration Configuration
 * Note: These should be set in .env.local for development and in DO/Vercel for production.
 */
const BUNNY_STORAGE_API_KEY = process.env.BUNNY_STORAGE_API_KEY;
const BUNNY_STORAGE_ZONE_NAME = process.env.BUNNY_STORAGE_ZONE_NAME;
const BUNNY_STORAGE_REGION = process.env.BUNNY_STORAGE_REGION || 'storage'; 

// Storage CDN (Global Pull Zone for images)
const STORAGE_PULL_ZONE = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL || 'https://dancetgt.b-cdn.net';

// Stream CDN (Specific to the Video Library)
const STREAM_CDN_HOSTNAME = 'vz-dc7bf078-297.b-cdn.net';
const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY;
const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || '617122';

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
    if (!BUNNY_STORAGE_API_KEY || !BUNNY_STORAGE_ZONE_NAME || !STORAGE_PULL_ZONE || STORAGE_PULL_ZONE.includes('undefined')) {
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
            url: `${STORAGE_PULL_ZONE}/${path}`,
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
    
    // 1. Check for official Bunny Stream domains
    if (url.includes('iframe.mediadelivery.net') || url.includes('video.bunnycdn.com')) return true;
    
    // 2. Check for bare GUID
    if (/^[a-z0-9-]{36}$/i.test(url)) return true;

    // 3. Check for Bunny Stream CDN domain + GUID pattern (most robust for custom pull zones)
    // This allows identifying streams even if the library ID is missing from the path
    const guidPattern = /[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}/i;
    return (url.includes(STREAM_CDN_HOSTNAME) || url.includes('b-cdn.net')) && guidPattern.test(url);
}

/**
 * Extracts the video ID from a Bunny Stream URL
 */
export function extractBunnyVideoId(url: string | null): string | null {
    if (!url || !isBunnyStream(url)) return null;

    const playerMatch = url.match(/\/play\/(\d+)\/([a-z0-9-]+)/i);
    const libraryMatch = url.match(/\/library\/(\d+)\/videos\/([a-z0-9-]+)/i);
    const embedMatch = url.match(/\/embed\/(\d+)\/([a-z0-9-]+)/i);
    const idOnlyMatch = url.match(/^([a-z0-9-]{36})$/i);

    if (playerMatch) return playerMatch[2];
    if (libraryMatch) return libraryMatch[2];
    if (embedMatch) return embedMatch[2];
    if (idOnlyMatch) return idOnlyMatch[1];

    const guidMatch = url.match(/([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})/i);
    if (guidMatch) return guidMatch[1];

    // Handle path pattern: pull-zone.b-cdn.net/(LIBRARY_ID/)?VIDEO_ID/...
    // e.g. https://vz-dc7bf078-297.b-cdn.net/581f44c4-7221-4f11-92b1-5a0256865668/thumbnail.jpg
    const cdnMatch = url.match(/b-cdn\.net\/(?:\d+\/)?([a-z0-9-]{36})/i);
    if (cdnMatch) return cdnMatch[1];

    return null;
}

export const isVideo = (url: string | null) => {
    if (!url) return false;
    // Check if it's a direct video link or a Bunny Stream iframe link
    return url.toLowerCase().match(/\.(mp4|webm|ogg|mov|m3u8)$/) !== null || isBunnyStream(url);
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
    
    if (!libraryId) {
        libraryId = BUNNY_STREAM_LIBRARY_ID;
    }

    // Use the official Stream CDN hostname
    // Format: https://{pullzone}.b-cdn.net/{libraryId}/{videoId}/play_720p.mp4
    return `https://${STREAM_CDN_HOSTNAME}/${libraryId}/${videoId}/play_720p.mp4`;
}

/**
 * Transforms a Bunny Stream player URL into a direct thumbnail URL
 * Format: https://{pullzone}.b-cdn.net/{videoId}/thumbnail.jpg
 */
export function getBunnyStreamThumbnailUrl(url: string | null): string | null {
    if (!url || !isBunnyStream(url)) return url;
    
    // 1. Extract video ID
    let videoId = '';
    let libraryId = '';
    const playerMatch = url.match(/\/play\/(\d+)\/([a-z0-9-]+)/i);
    const libraryMatch = url.match(/\/library\/(\d+)\/videos\/([a-z0-9-]+)/i);
    const embedMatch = url.match(/\/embed\/(\d+)\/([a-z0-9-]+)/i);
    const idOnlyMatch = url.match(/^([a-z0-9-]{36})$/i);

    if (playerMatch) {
        libraryId = playerMatch[1];
        videoId = playerMatch[2];
    } else if (libraryMatch) {
        libraryId = libraryMatch[1];
        videoId = libraryMatch[2];
    } else if (embedMatch) {
        libraryId = embedMatch[1];
        videoId = embedMatch[2];
    } else if (idOnlyMatch) {
        videoId = idOnlyMatch[1];
    } else {
        const guidMatch = url.match(/([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})/i);
        if (guidMatch) videoId = guidMatch[1];
    }
    
    if (!libraryId) {
        libraryId = BUNNY_STREAM_LIBRARY_ID;
    }

    if (!videoId) return url;
    
    // Use the official Stream CDN hostname for thumbnails
    // Format: https://{pullzone}.b-cdn.net/{libraryId}/{videoId}/thumbnail.jpg
    return `https://${STREAM_CDN_HOSTNAME}/${libraryId}/${videoId}/thumbnail.jpg`;
}

/**
 * Transforms a Bunny Stream player or direct link into the official player embed URL
 * Format: https://player.mediadelivery.net/embed/{libraryId}/{videoId}
 */
export function getBunnyStreamEmbedUrl(url: string | null, autoplay: boolean = false): string | null {
    if (!url) return null;
    
    let videoId = '';
    let libraryId = BUNNY_STREAM_LIBRARY_ID;

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

    // Return the modern embed URL with explicit autoplay state
    return `https://player.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=${autoplay}&muted=true&preload=true&loop=true`;
}

/**
 * Uploads a video to Bunny Stream
 * Note: This involves creating a video entry and then uploading the content.
 */
export async function uploadToBunnyStream(file: Buffer | File, title: string): Promise<UploadResponse> {
    if (!BUNNY_STREAM_API_KEY || BUNNY_STREAM_LIBRARY_ID === '617122' && !process.env.BUNNY_STREAM_LIBRARY_ID) {
        // Fallback check: if we are using the hardcoded ID, we still need the API key
        if (!BUNNY_STREAM_API_KEY) return { success: false, url: '', error: 'Bunny.net Stream API key missing.' };
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
            url: `https://player.mediadelivery.net/embed/${BUNNY_STREAM_LIBRARY_ID}/${videoId}`, // Standard player URL
            mediaId: videoId,
        };
    } catch (error: any) {
        console.error('Error uploading to Bunny Stream:', error);
        return { success: false, url: '', error: error.message };
    }
}
