import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const YANGON_LOCATION_BIAS = {
    circle: {
        center: {
            latitude: 16.8409,
            longitude: 96.1735
        },
        radius: 50000
    }
};

const FIELD_MASK = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.nationalPhoneNumber',
    'places.internationalPhoneNumber',
    'places.websiteUri',
    'places.googleMapsUri',
    'places.location',
    'places.primaryType',
    'places.types',
    'places.rating',
    'places.photos.name',
    'nextPageToken'
].join(',');

type GooglePlace = {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    websiteUri?: string;
    googleMapsUri?: string;
    location?: { latitude?: number; longitude?: number };
    primaryType?: string;
    types?: string[];
    rating?: number;
    photos?: { name?: string }[];
};

function mapCategory(place: GooglePlace) {
    const types = new Set([place.primaryType, ...(place.types || [])].filter(Boolean));

    if (types.has('spa')) return 'SPA';
    if (types.has('massage')) return 'Massage';
    if (types.has('night_club') || types.has('bar')) return 'CLUB';
    if (types.has('restaurant')) return 'RESTAURANT';
    return 'others';
}

async function getAdminFromRequest(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!supabaseUrl || !serviceRoleKey) {
        return { error: 'Server configuration missing: Supabase credentials.', status: 500 };
    }

    if (!token) {
        return { error: 'Missing authorization token.', status: 401 };
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    const userId = authData.user?.id;

    if (authError || !userId) {
        return { error: 'Invalid authorization token.', status: 401 };
    }

    const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

    if (profileError || !['admin', 'super admin', 'admin sales'].includes(profile?.role)) {
        return { error: 'Admin access required.', status: 403 };
    }

    return { userId };
}

export async function POST(req: NextRequest) {
    try {
        const admin = await getAdminFromRequest(req);
        if ('error' in admin) {
            return NextResponse.json({ error: admin.error }, { status: admin.status });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'Google Maps API key is not configured.' }, { status: 500 });
        }

        const { query, pageToken, existingPlaceIds = [] } = await req.json();
        const textQuery = typeof query === 'string' ? query.trim() : '';

        if (!textQuery && !pageToken) {
            return NextResponse.json({ error: 'Search query is required.' }, { status: 400 });
        }

        const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': FIELD_MASK
            },
            body: JSON.stringify({
                textQuery: textQuery || undefined,
                pageToken: pageToken || undefined,
                pageSize: 20,
                regionCode: 'MM',
                languageCode: 'en',
                locationBias: YANGON_LOCATION_BIAS
            })
        });

        const payload = await response.json();

        if (!response.ok) {
            const message = payload?.error?.message || 'Google Places search failed.';
            return NextResponse.json({ error: message }, { status: response.status });
        }

        const existingIds = new Set<string>(existingPlaceIds.filter(Boolean));
        const places = ((payload.places || []) as GooglePlace[])
            .filter((place) => place.id && !existingIds.has(place.id))
            .map((place) => {
                const photoName = place.photos?.[0]?.name || null;

                return {
                    name: place.displayName?.text || '',
                    address: place.formattedAddress || '',
                    phone: place.nationalPhoneNumber || place.internationalPhoneNumber || '',
                    website: place.websiteUri || '',
                    category: mapCategory(place),
                    google_place_id: place.id,
                    google_maps_url: place.googleMapsUri || '',
                    rating: place.rating || null,
                    location: place.location || null,
                    types: place.types || [],
                    photo_name: photoName,
                    photo_url: photoName
                        ? `/api/admin/google-places/photo?name=${encodeURIComponent(photoName)}`
                        : null
                };
            })
            .filter((place) => place.name);

        return NextResponse.json({
            places,
            nextPageToken: payload.nextPageToken || null
        });
    } catch (error: unknown) {
        console.error('[Google Places Search API]', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
