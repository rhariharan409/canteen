const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseSecret) {
  console.error('Missing env vars.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecret);

async function testConnection() {
  console.log('Testing Supabase connection...');
  try {
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*').limit(5);
    console.log('Profiles result:', { profilesCount: profiles?.length, pError });
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testConnection();
