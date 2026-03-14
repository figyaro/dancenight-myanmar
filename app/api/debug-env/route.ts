import { NextResponse } from 'next/server';

export async function GET() {
    // Only return BOOLEANS to keep it safe
    return NextResponse.json({
        BUNNY_STORAGE_API_KEY: !!process.env.BUNNY_STORAGE_API_KEY,
        BUNNY_STORAGE_ZONE_NAME: !!process.env.BUNNY_STORAGE_ZONE_NAME,
        BUNNY_PULL_ZONE_URL: !!process.env.BUNNY_PULL_ZONE_URL,
        BUNNY_STREAM_API_KEY: !!process.env.BUNNY_STREAM_API_KEY,
        BUNNY_STREAM_LIBRARY_ID: !!process.env.BUNNY_STREAM_LIBRARY_ID,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        DEBUG_INFO: "Check if these are true in the DigitalOcean runtime logs"
    });
}
