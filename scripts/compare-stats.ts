import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function compareStats() {
    console.log("--- Starting Comparison ---");
    
    // 1. Get the list of users
    const { data: listData, error: listError } = await supabase.rpc('get_users_with_stats');
    if (listError) {
        console.error("List RPC Error:", listError);
        return;
    }

    // Pick MS or the first user with coins if possible
    const ms = listData.find((u: any) => u.nickname?.includes('MS') || u.nickname === 'MS' || u.dtip_balance > 0);
    const target = ms || listData[0];

    if (!target) {
        console.log("No users found.");
        return;
    }

    console.log("Target User (from List RPC):", {
        id: target.id,
        nickname: target.nickname,
        post_count: target.post_count,
        dtip_balance: target.dtip_balance
    });

    // 2. Get comprehensive stats for the same user
    const { data: compStats, error: compError } = await supabase.rpc('get_user_comprehensive_stats', { p_user_id: target.id });
    if (compError) {
        console.error("Comp RPC Error:", compError);
    } else {
        console.log("Comp Stats (from Inspection RPC):", compStats);
    }

    // 3. Direct query test
    const { count: directPosts } = await supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', target.id);
    const { data: wallet } = await supabase.from('wallets').select('balance').eq('user_id', target.id).single();

    console.log("Direct Query Check:", {
        direct_posts: directPosts,
        direct_wallet: wallet?.balance
    });
}

compareStats();
