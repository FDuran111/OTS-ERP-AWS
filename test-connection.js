const { Client } = require('pg');

// Direct connection string without environment variables
const connectionString = 'postgresql://postgres.xudcmdliqyarbfdqufbq:pU8yhL85GQxHtWuU@aws-0-us-east-2.pooler.supabase.com:6543/postgres';

const client = new Client({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected!');
    
    const res = await client.query('SELECT NOW()');
    console.log('Current time:', res.rows[0].now);
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    console.error('Error code:', err.code);
  }
}

test();