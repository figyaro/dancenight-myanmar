import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const userId = '408d093e-fd72-408f-8aef-02082db0e707'; // Admin user ID, let's just see their auth status

async function run() {
    console.log("Checking Auth user:", userId);
    
    // 1. Get User
    const getRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
        }
    });
    console.log("GET status:", getRes.status);
    const getData = await getRes.json();
    console.log("GET response:", JSON.stringify(getData, null, 2));

    // 2. Try to update someone (themselves or dummy)
    // Actually, maybe updating is what fails. We'll just do a dry run on getting users.
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
        }
    });
    console.log("LIST status:", listRes.status);
    const listData = await listRes.json();
    console.log("Users found:", listData?.users?.length);
    if (listData?.users?.length > 0) {
        const sampleUser = listData.users.find(u => u.email !== getData.email) || listData.users[0];
        console.log("Trying to update user:", sampleUser.id);
        
        const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${sampleUser.id}`, {
            method: 'PUT', // Supabase v1 Admin API uses PUT for update
            headers: {
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_metadata: { updated: true } }) // harmless update
        });
        
        console.log("UPDATE status:", updateRes.status);
        const updateData = await updateRes.json();
        console.log("UPDATE response:", updateData);
    }
}

run().catch(console.error);
