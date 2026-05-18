import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const name = req.nextUrl.searchParams.get('name');

    if (!apiKey || !name || !/^places\/[^/]+\/photos\/[^/]+$/.test(name)) {
        return new NextResponse(null, { status: 404 });
    }

    const mediaUrl = new URL(`https://places.googleapis.com/v1/${name}/media`);
    mediaUrl.searchParams.set('maxWidthPx', '400');
    mediaUrl.searchParams.set('key', apiKey);

    const response = await fetch(mediaUrl);

    if (!response.ok) {
        return new NextResponse(null, { status: response.status });
    }

    return new NextResponse(await response.arrayBuffer(), {
        headers: {
            'Content-Type': response.headers.get('content-type') || 'image/jpeg',
            'Cache-Control': 'private, max-age=3600'
        }
    });
}
