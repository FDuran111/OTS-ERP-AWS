const { Client } = require('pg');

// Try different connection strings
const connectionStrings = [
  "postgresql://postgres:Pirata@0525!@db.vrydsuzrarvzhjsetrvy.supabase.co:5432/postgres",
  "postgresql://postgres.vrydsuzrarvzhjsetrvy:Pirata@0525!@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
  "postgresql://postgres.vrydsuzrarvzhjsetrvy:Pirata@0525!@aws-0-us-west-1.pooler.supabase.com:6543/postgres",
  "postgresql://postgres.vrydsuzrarvzhjsetrvy:Pirata@0525!@aws-0-us-west-2.pooler.supabase.com:6543/postgres",
];

async function testConnection(connString, label) {
  const client = new Client({
    connectionString: connString,
  });

  try {
    console.log(`\nTesting ${label}...`);
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log(`✅ Success! Connected at: ${res.rows[0].now}`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`❌ Failed: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('Testing Supabase connections...\n');
  
  for (let i = 0; i < connectionStrings.length; i++) {
    const success = await testConnection(connectionStrings[i], `Connection ${i + 1}`);
    if (success) {
      console.log(`\n✅ Working connection string:\n${connectionStrings[i]}`);
      break;
    }
  }
}

main();