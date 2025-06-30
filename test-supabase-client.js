const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xudcmdliqyarbfdqufbq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZGNtZGxpcXlhcmJmZHF1ZmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MzgzMzUsImV4cCI6MjA2NTQxNDMzNX0.wf9YrjJShp1xrv7pw60u4cyJ7ljjAPIS0bIVBmDsOvs';

async function testSupabaseClient() {
  console.log('Testing Supabase JS client...');
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Test query
    const { data, error } = await supabase
      .from('User')
      .select('count()')
      .single();
    
    if (error) {
      console.error('❌ Error:', error);
    } else {
      console.log('✅ Connected via Supabase client!');
      console.log('✅ Result:', data);
    }
    
    // Try to get users
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('id, email, name')
      .limit(5);
      
    if (usersError) {
      console.error('❌ Users query error:', usersError);
    } else {
      console.log('✅ Found users:', users?.length || 0);
    }
    
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

testSupabaseClient();