import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    const tables = ['dancers', 'conversations', 'messages', 'users', 'room_reservations'];
    
    for (const table of tables) {
        console.log(`\n--- Checking table: ${table} ---`);
        const { data, error } = await supabase.from(table).select('*').limit(1);

        if (error) {
            console.error(`Error fetching ${table}:`, JSON.stringify(error, null, 2));
        } else {
            console.log(`Success! Found ${data.length} records in ${table}.`);
            if (data.length > 0) {
                console.log('Sample record:', data[0]);
            }
        }
    }
}

checkTables();
