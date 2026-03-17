import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCounts() {
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: postCount } = await supabase.from('posts').select('*', { count: 'exact', head: true });
    const { count: walletCount } = await supabase.from('wallets').select('*', { count: 'exact', head: true });

    console.log("Database Stats:", {
        users: userCount,
        posts: postCount,
        wallets: walletCount
    });
}

checkCounts();
