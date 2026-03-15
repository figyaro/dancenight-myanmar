import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

/**
 * COMPREHENSIVE Admin API to fix broken image URLs in the database.
 * Covers: events, posts, shops, dancers, users
 * Replaces "undefined/..." with the correct "BUNNY_PULL_ZONE_URL"
 */
export async function GET(req: NextRequest) {
    try {
        const PULL_ZONE = process.env.NEXT_PUBLIC_BUNNY_PULL_ZONE_URL || 'https://dancetgt.b-cdn.net';
        const stats: Record<string, number> = {
            events: 0,
            posts: 0,
            shops: 0,
            dancers: 0,
            users: 0
        };

        // Configuration for repair: [TableName, ColumnWithUrl]
        const targets: [string, string][] = [
            ['events', 'image_url'],
            ['posts', 'main_image_url'],
            ['shops', 'main_image_url'],
            ['dancers', 'image_url'],
            ['users', 'avatar_url']
        ];

        for (const [table, column] of targets) {
            // 1. Fetch records that look broken:
            // - Contain 'undefined'
            // - OR don't start with 'http' (relative paths)
            const { data, error } = await supabase
                .from(table)
                .select(`id, ${column}`)
                .or(`${column}.ilike.%undefined%,${column}.not.ilike.http%`) as any;

            if (error) {
                console.error(`Error fetching ${table}:`, error);
                continue;
            }

            if (data && data.length > 0) {
                console.log(`[Repair] Found ${data.length} potentially broken records in ${table}`);
                for (const row of data) {
                    const brokenUrl = (row as any)[column] as string;
                    if (!brokenUrl) continue;
                    
                    let fixedUrl = brokenUrl;
                    
                    // Case A: URL contains 'undefined'
                    if (brokenUrl.includes('undefined')) {
                        // Extract path after 'undefined/' or just use the whole thing if no slash
                        const pathMatch = brokenUrl.match(/undefined\/(.*)/);
                        const path = pathMatch ? pathMatch[1] : brokenUrl.replace('undefined', '');
                        fixedUrl = `${PULL_ZONE}/${path.replace(/^\/+/, '')}`;
                    } 
                    // Case B: Relative URL (doesn't start with http and isn't empty)
                    else if (!brokenUrl.startsWith('http')) {
                        fixedUrl = `${PULL_ZONE}/${brokenUrl.replace(/^\/+/, '')}`;
                    }
                    
                    if (fixedUrl === brokenUrl || !fixedUrl.startsWith('http')) continue;

                    const { error: updateError } = await supabase
                        .from(table)
                        .update({ [column]: fixedUrl })
                        .eq('id', row.id);
                    
                    if (!updateError) {
                        stats[table]++;
                    } else {
                        console.error(`[Repair] Failed to update ${table} ID ${row.id}:`, updateError);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            summary: stats,
            pull_zone_fixed_to: PULL_ZONE,
            message: "Database URLs successfully repaired."
        });

    } catch (error: any) {
        console.error('[Repair API Internal Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
