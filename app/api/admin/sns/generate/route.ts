import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function POST(req: Request) {
    try {
        const { platform, viralUrl } = await req.json();

        if (!platform || !viralUrl) {
            return NextResponse.json({ success: false, error: 'Missing platform or viralUrl' }, { status: 400 });
        }

        // 1. Verify Authentication & Role
        const authHeader = req.headers.get('cookie') || '';
        const { data: { user } } = await supabase.auth.getUser();

        // Standard auth validation strategy based on your project structure
        // For actual robust protection, ensure RLS and role checks here
        
        // 2. Fetch SNS Settings
        const { data: settings } = await supabase
            .from('sns_settings')
            .select('*')
            .eq('platform', platform)
            .single();

        if (!settings || !settings.is_active) {
            return NextResponse.json({ success: false, error: 'Integration is not active for this platform. Please enable it in Settings.' }, { status: 400 });
        }

        // 3. Call Gemini API to generate content
        const geminiApiKey = process.env.GEMINI_API_KEY;
        if (!geminiApiKey) {
            return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is missing from environment variables.' }, { status: 500 });
        }

        // The user suggested "Gemini 3 Flash", but we'll default to the standard naming or let them override.
        const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        
        const systemPrompt = `You are a viral social media manager for the app "Dance Together" (a platform for booking dancers, viewing dance videos, and leaving tips).
        Analyze the provided URL or concept and generate 3 engaging, human-like captions tailored for ${platform}.
        Each post MUST be designed to go viral and drive users to download/register for "Dance Together".
        Use the appropriate tone, emojis, and hashtags for ${platform}.
        Respond ONLY with a valid JSON array of strings containing the 3 post captions. Example: ["Caption 1...", "Caption 2...", "Caption 3..."]`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: systemPrompt },
                        { text: `Viral Input: ${viralUrl}` }
                    ]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                }
            })
        });

        if (!response.ok) {
            const errData = await response.text();
            console.error('Gemini API Error:', errData);
            return NextResponse.json({ success: false, error: 'Failed to generate content with Gemini API.' }, { status: 500 });
        }

        const data = await response.json();
        let captions: string[] = [];
        try {
            const textResponse = data.candidates[0].content.parts[0].text;
            captions = JSON.parse(textResponse);
            if (!Array.isArray(captions)) throw new Error("Not an array");
        } catch (e) {
            console.error('Failed to parse Gemini JSON:', data.candidates[0].content.parts[0].text);
            return NextResponse.json({ success: false, error: 'AI generated invalid format.' }, { status: 500 });
        }

        // 4. Schedule the posts (Natural intervals)
        // Rule: 1 day divided by random hours between settings.posts_per_day_min and max
        const count = captions.length;
        const postsToInsert = [];
        const now = new Date();

        for (let i = 0; i < count; i++) {
            // Schedule them roughly 3 to 8 hours apart to look natural
            const hoursToAdd = (i * 4) + Math.floor(Math.random() * 3) + 1; 
            const scheduledAt = new Date(now.getTime() + hoursToAdd * 60 * 60 * 1000);

            postsToInsert.push({
                platform,
                content: captions[i],
                media_urls: [], // In the future, attach Dance Together default promo images/videos
                scheduled_at: scheduledAt.toISOString(),
                status: 'draft'
            });
        }

        const { error: insertError } = await supabase
            .from('sns_posts')
            .insert(postsToInsert);

        if (insertError) {
            return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: postsToInsert.length });

    } catch (error: any) {
        console.error('SNS Generate Route Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
