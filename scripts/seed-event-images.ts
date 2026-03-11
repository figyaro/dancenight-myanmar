import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bgbmkenuarxsepclukgc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYm1rZW51YXJ4c2VwY2x1a2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMjIyODcsImV4cCI6MjA4NzU5ODI4N30.jnZE_BNVC_x7tqReF3kUVJ-tCm24Me8iTg2ER0RBHiQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedEvents() {
    console.log("Seeding sample events with high-quality images...");

    const samples = [
        {
            title: 'K-POP Dance Night: LIVE performance',
            description: 'Join us for a spectacular K-POP dance performance featuring the latest hits! Experience the energy and choreography like never before.',
            date: new Date(Date.now() + 86400000 * 2).toISOString(),
            place: 'Yangon Stage Lounge',
            location: 'Downtown Yangon',
            image_url: '/images/events/kpop_dance_event.png',
            fee: '25,000 MMK',
            contact_phone: '09-12345678'
        },
        {
            title: 'Latin Passion: Salsa & Bachata Night',
            description: 'A sophisticated night of Latin dance. Whether you are a pro or a beginner, come dance the night away in our elegant lounge.',
            date: new Date(Date.now() + 86400000 * 5).toISOString(),
            place: 'Elegant Lounge & Bar',
            location: 'Inya Lake Side',
            image_url: '/images/events/latin_dance_night.png',
            fee: '30,000 MMK',
            contact_phone: '09-87654321'
        },
        {
            title: 'EDM Night: Yangon Underground Raven',
            description: 'The best EDM beats in the city! Join us for a night of lasers, DJ performances, and non-stop dancing.',
            date: new Date(Date.now() + 86400000 * 7).toISOString(),
            place: 'Velvet Underground',
            location: 'Hlaing Township',
            image_url: '/images/events/edm_club_party_yangon.png',
            fee: '20,000 MMK',
            contact_phone: '09-11122233'
        }
    ];

    const { error } = await supabase.from('events').upsert(samples, { onConflict: 'title' });

    if (error) {
        console.error("Error seeding events:", error);
    } else {
        console.log("Sample events successfully registered to Supabase!");
    }
}

seedEvents();
