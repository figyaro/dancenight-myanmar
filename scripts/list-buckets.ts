import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuckets() {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
        console.error('Error listing buckets:', error);
    } else {
        console.log('Available Buckets:');
        buckets.forEach(b => {
            console.log(`- ${b.id} (Public: ${b.public}, File Size Limit: ${b.file_size_limit}, Allowed MIME Types: ${JSON.stringify(b.allowed_mime_types)})`);
        });
    }
}

checkBuckets();
