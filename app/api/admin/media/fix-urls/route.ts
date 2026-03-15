import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

/**
 * One-time Admin API to fix broken image URLs in the database.
 * Changes "undefined/uploads/..." to "https://dancetgt.b-cdn.net/uploads/..."
 */
export async function GET(req: NextRequest) {
    try {
        const PULL_ZONE = process.env.BUNNY_PULL_ZONE_URL || 'https://dancetgt.b-cdn.net';
        
        // 1. Repair 'events' table
        const { data: events, error: eFetchError } = await supabase
            .from('events')
            .select('id, image_url')
            .filter('image_url', 'ilike', 'undefined/%');

        let repairedEvents = 0;
        if (events && events.length > 0) {
            for (const event of events) {
                const fixedUrl = event.image_url.replace('undefined/', `${PULL_ZONE}/`);
                const { error: eUpdateError } = await supabase
                    .from('events')
                    .update({ image_url: fixedUrl })
                    .eq('id', event.id);
                if (!eUpdateError) repairedEvents++;
            }
        }

        // 2. Repair 'posts' table
        const { data: posts, error: pFetchError } = await supabase
            .from('posts')
            .select('id, image_url')
            .filter('image_url', 'ilike', 'undefined/%');

        let repairedPosts = 0;
        if (posts && posts.length > 0) {
            for (const post of posts) {
                const fixedUrl = post.image_url.replace('undefined/', `${PULL_ZONE}/`);
                const { error: pUpdateError } = await supabase
                    .from('posts')
                    .update({ image_url: fixedUrl })
                    .eq('id', post.id);
                if (!pUpdateError) repairedPosts++;
            }
        }

        return NextResponse.json({
            success: true,
            summary: {
                events_repaired: repairedEvents,
                posts_repaired: repairedPosts,
                pull_zone_used: PULL_ZONE
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
