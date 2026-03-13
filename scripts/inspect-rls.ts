import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY; // Use service role to bypass RLS

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPolicies() {
    console.log("Inspecting RLS policies for 'posts' table...");
    
    const { data: policies, error: policiesError } = await supabase.rpc('get_policies', { table_name: 'posts' });

    if (policiesError) {
        // If RPC doesn't exist, try direct query on pg_policies
        console.log("RPC 'get_policies' failed, trying direct query...");
        const { data, error } = await supabase.from('pg_policies').select('*').eq('tablename', 'posts');
        if (error) {
            console.error("Error fetching policies:", error);
            // Fallback: try to create the RPC
            console.log("Please create a function to list policies if possible, or check Supabase dashboard.");
        } else {
            console.log("Policies for 'posts':", data);
        }
    } else {
        console.log("Policies for 'posts':", policies);
    }
}

inspectPolicies();
