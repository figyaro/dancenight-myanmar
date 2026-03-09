import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPostColumns() {
    console.log("Checking full users table structure using REST reflection...");

    try {
        // Try to get one row to see the keys
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .limit(1);

        if (userError) {
            console.error("Error fetching users:", userError);
            return;
        }

        if (userData && userData.length > 0) {
            console.log("Found columns in users table:", Object.keys(userData[0]));
        } else {
            console.log("Users table is empty. Trying to insert a dummy record to see constraints...");

            const { data, error } = await supabase
                .from('users')
                .insert([{ id: '00000000-0000-0000-0000-000000000000' }])
                .select();

            if (error) {
                console.log("Insert failed as expected. Error details may reveal required columns:", error);
            }
        }

    } catch (err) {
        console.error("Unexpected error:", err);
    }
}

checkPostColumns();
