const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('Testing database connection...');
  const connectionString = process.env.DATABASE_URL;
  console.log('Connection string:', connectionString?.replace(/:[^:@]+@/, ':****@'));
  
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const res = await client.query('SELECT $1::text as message', ['Hello from Supabase!']);
    console.log('✅ Query result:', res.rows[0].message);
    
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    if (err.message.includes('password')) {
      console.error('This appears to be a password issue. Please verify the password is correct.');
    }
  } finally {
    await client.end();
  }
}

testConnection();