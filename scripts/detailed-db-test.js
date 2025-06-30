const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testAllConnections() {
  const password = 'pU8yhL85GQxHtWuU';
  
  const connections = [
    {
      name: 'Session Pooler (Port 5432)',
      url: `postgresql://postgres.xudcmdliqyarbfdqufbq:${password}@aws-0-us-east-2.pooler.supabase.com:5432/postgres`
    },
    {
      name: 'Transaction Pooler (Port 6543)',
      url: `postgresql://postgres.xudcmdliqyarbfdqufbq:${password}@aws-0-us-east-2.pooler.supabase.com:6543/postgres`
    },
    {
      name: 'Direct Connection',
      url: `postgresql://postgres:${password}@db.xudcmdliqyarbfdqufbq.supabase.co:5432/postgres`
    }
  ];

  for (const conn of connections) {
    console.log(`\nTesting ${conn.name}...`);
    console.log(`URL: ${conn.url.replace(password, '****')}`);
    
    const client = new Client({
      connectionString: conn.url,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000
    });

    try {
      await client.connect();
      console.log('✅ Connected successfully!');
      
      const res = await client.query('SELECT NOW()');
      console.log('✅ Time from database:', res.rows[0].now);
      
      await client.end();
    } catch (err) {
      console.error('❌ Error:', err.message);
      if (err.code) console.error('   Error code:', err.code);
    }
  }
}

testAllConnections();