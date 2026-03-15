import { NextRequest, NextResponse } from 'next/server';

const BUNNY_STREAM_API_KEY = process.env.BUNNY_STREAM_API_KEY;
const BUNNY_STREAM_LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID;

export async function GET(req: NextRequest) {
    const videoId = req.nextUrl.searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    if (!BUNNY_STREAM_API_KEY || !BUNNY_STREAM_LIBRARY_ID) {
        return NextResponse.json({ error: 'Bunny configuration missing' }, { status: 500 });
    }

    try {
        const response = await fetch(`https://video.bunnycdn.com/library/${BUNNY_STREAM_LIBRARY_ID}/videos/${videoId}`, {
            method: 'GET',
            headers: {
                AccessKey: BUNNY_STREAM_API_KEY,
                accept: 'application/json',
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch video status: ${response.statusText}`);
        }

        const data = await response.json();
        
        return NextResponse.json({
            status: data.status, // 0 = Queued, 1 = Processing, 2 = Encoding, 3 = Finished, 4 = Resolution finished, 5 = Failed, 6 = PresignedUploadWaiting
            encodeProgress: data.encodeProgress,
            ready: data.status === 4 || data.status === 3 || data.status === 5,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
