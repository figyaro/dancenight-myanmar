import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// Helper to post to Telegram
async function postToTelegram(credentials: any, content: string) {
    const { bot_token, chat_id } = credentials;
    if (!bot_token || !chat_id) throw new Error("Missing bot_token or chat_id for Telegram");

    // https://core.telegram.org/bots/api#sendmessage
    const res = await fetch(`https://api.telegram.org/bot${bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id, text: content })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Telegram API Error: ${err}`);
    }
    return res.json();
}

// Helper to post to Facebook Page
async function postToFacebook(credentials: any, content: string) {
    const { page_access_token, page_id } = credentials;
    if (!page_access_token || !page_id) throw new Error("Missing page_access_token or page_id for Facebook");

    const res = await fetch(`https://graph.facebook.com/v19.0/${page_id}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, access_token: page_access_token })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Facebook API Error: ${err}`);
    }
    return res.json();
}

export async function GET(req: Request) {
    // Standard cron security check (e.g. valid auth token or Vercel cron secret)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Un-comment to enforce security in production:
    // if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    //     return new Response('Unauthorized', { status: 401 });
    // }

    try {
        const now = new Date().toISOString();

        // 1. Fetch pending posts whose scheduled_at time has passed
        const { data: pendingPosts, error: fetchError } = await supabase
            .from('sns_posts')
            .select('id, platform, content, media_urls, scheduled_at, sns_settings(credentials, is_active)')
            .eq('status', 'pending')
            .lte('scheduled_at', now)
            .limit(10); // Process in batches

        if (fetchError) throw fetchError;
        if (!pendingPosts || pendingPosts.length === 0) {
            return NextResponse.json({ success: true, message: 'No pending posts' });
        }

        const results = [];

        // 2. Process each post
        for (const post of pendingPosts) {
            const settings = post.sns_settings as any;
            if (!settings || !settings.is_active) {
                // If the integration was disabled after scheduling, skip (mark failed or leave pending)
                results.push({ id: post.id, status: 'skipped (inactive settings)' });
                continue;
            }

            try {
                // Determine API call based on platform
                switch (post.platform.toLowerCase()) {
                    case 'telegram':
                        await postToTelegram(settings.credentials, post.content);
                        break;
                    case 'facebook':
                        await postToFacebook(settings.credentials, post.content);
                        break;
                    // Add other platforms (TikTok, Instagram, Viber) as needed based on official API integration
                    default:
                        throw new Error(`Platform plugin for ${post.platform} not fully implemented yet.`);
                }

                // 3. Mark as posted
                await supabase
                    .from('sns_posts')
                    .update({ status: 'posted', posted_at: new Date().toISOString() })
                    .eq('id', post.id);

                results.push({ id: post.id, status: 'posted' });

            } catch (err: any) {
                // 4. Mark as failed and log error
                await supabase
                    .from('sns_posts')
                    .update({ status: 'failed', error_log: err.message })
                    .eq('id', post.id);
                
                results.push({ id: post.id, status: 'failed', error: err.message });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('SNS Cron Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
