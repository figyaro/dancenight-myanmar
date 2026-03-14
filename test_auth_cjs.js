const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
let url = '';
let key = '';
env.split('\n').forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
});

async function test() {
    console.log("URL:", url);
    console.log("KEY length:", key.length);

    // List users
    const getRes = await fetch(`${url}/auth/v1/admin/users`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log("LIST status:", getRes.status);
    const data = await getRes.json();
    console.log("Total users:", data.users?.length);

    if (data.users && data.users.length > 0) {
        const targetUser = data.users[0];
        console.log("Testing UPDATE on user:", targetUser.id, targetUser.email);
        
        const updateRes = await fetch(`${url}/auth/v1/admin/users/${targetUser.id}`, {
            method: 'PUT',
            headers: { 
                'apikey': key, 
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_metadata: { test: true } })
        });
        console.log("UPDATE status:", updateRes.status);
        console.log("UPDATE response:", await updateRes.json());
    }
}
test().catch(console.error);
