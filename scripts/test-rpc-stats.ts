import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
    console.log("Calling get_users_with_stats...");
    const { data, error } = await supabase.rpc('get_users_with_stats');
    
    if (error) {
        console.error("RPC Error:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("First user stats:", {
            nickname: data[0].nickname,
            post_count: data[0].post_count,
            dtip_balance: data[0].dtip_balance
        });
        console.log("Sample data keys:", Object.keys(data[0]));
    } else {
        console.log("No data returned from RPC.");
    }
}

testRpc();
