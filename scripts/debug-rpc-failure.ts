import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRpc() {
    console.log("Checking RPC: get_users_with_stats...");
    const { data, error } = await supabase.rpc('get_users_with_stats');
    
    if (error) {
        console.error("RPC Error Details:");
        console.error("Message:", error.message);
        console.error("Hint:", error.hint);
        console.error("Details:", error.details);
        console.error("Code:", error.code);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Success! Found ${data.length} users.`);
        const ms = data.find((u: any) => u.nickname?.includes('MS') || u.email?.includes('MS'));
        if (ms) {
            console.log("Found user MS:", ms);
        } else {
            console.log("User MS not found by nickname/email in the first page of results.");
            console.log("First user sample:", data[0]);
        }
    } else {
        console.log("No data returned from RPC.");
    }
}

debugRpc();
