import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPosts() {
    console.log("Checking posts table...");
    const { data, error } = await supabase.from('posts').select('*');

    if (error) {
        console.error("Error fetching posts:", error);
    } else {
        console.log(`Found ${data.length} posts.`);
        if (data.length > 0) {
            console.log(data[0]);
        } else {
            console.log("Possible causes: 1) Table is empty 2) RLS is enabled without a SELECT policy for anon.");
        }
    }
}

checkPosts();
