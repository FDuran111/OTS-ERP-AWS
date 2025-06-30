const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testAllConnections() {
  const password = 'pU8yhL85GQxHtWuU';
  
  const connections = [
    {
      name: 'Session Pooler',
      url: `postgresql://postgres.xudcmdliqyarbfdqufbq:${password}@aws-0-us-east-2.pooler.supabase.com:5432/postgres`
    },
    {
      name: 'Transaction Pooler', 
      url: `postgresql://postgres.xudcmdliqyarbfdqufbq:${password}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`
    }
  ];

  for (const conn of connections) {
    console.log(`\nTesting ${conn.name}...`);
    const client = new Client({
      connectionString: conn.url,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log('✅ Connected successfully!');
      
      const res = await client.query('SELECT COUNT(*) FROM "User"');
      console.log('✅ User count:', res.rows[0].count);
      
      await client.end();
      
      // If this works, update .env.local
      console.log(`\n🎉 ${conn.name} is working! Use this connection string:`);
      console.log(conn.url.replace(password, '[YOUR-PASSWORD]'));
      break;
      
    } catch (err) {
      console.error('❌ Error:', err.message);
    }
  }
}

console.log('Testing Supabase connections after restart...');
testAllConnections();