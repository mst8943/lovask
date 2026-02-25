/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLocal = fs.readFileSync('.env.local', 'utf8');
const env = {};
envLocal.split(/\r?\n/).forEach(line => {
    if (line.trim().startsWith('#') || !line.includes('=')) return;
    const [k, ...v] = line.split('=');
    env[k.trim()] = v.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('Fetching users and settings...');
    let hasMore = true;
    let allUsers = [];
    let page = 0;

    while (hasMore) {
        const { data: users, error } = await supabase.from('users').select('id').range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !users || users.length === 0) {
            hasMore = false;
        } else {
            allUsers.push(...users);
            page++;
        }
    }

    hasMore = true;
    let allSettings = [];
    page = 0;
    while (hasMore) {
        const { data: settings, error } = await supabase.from('user_settings').select('user_id').range(page * 1000, (page + 1) * 1000 - 1);
        if (error || !settings || settings.length === 0) {
            hasMore = false;
        } else {
            allSettings.push(...settings);
            page++;
        }
    }

    const settingsSet = new Set(allSettings.map(s => s.user_id));
    const missing = allUsers.filter(u => !settingsSet.has(u.id));

    console.log(`Found ${allUsers.length} users and ${allSettings.length} settings.`);
    console.log(`Found ${missing.length} users missing user_settings.`);

    if (missing.length > 0) {
        const batch = missing.map(u => ({
            user_id: u.id,
            message_request_mode: 'open'
        }));

        for (let i = 0; i < batch.length; i += 500) {
            const slice = batch.slice(i, i + 500);
            const { error } = await supabase.from('user_settings').insert(slice);
            if (error) {
                console.error('Error inserting slice:', error);
            } else {
                console.log(`Inserted batch of ${slice.length}`);
            }
        }
    }
    console.log('Done!');
}

main();
