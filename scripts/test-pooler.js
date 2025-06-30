const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  // Try transaction pooler with pgbouncer mode
  const connectionString = 'postgresql://postgres.xudcmdliqyarbfdqufbq:pU8yhL85GQxHtWuU@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1';
  
  console.log('Testing Supabase connection...');
  console.log('URL:', connectionString.replace(/:[^:@]+@/, ':****@'));
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    statement_timeout: 30000
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to Supabase!');
    
    const result = await client.query('SELECT version()');
    console.log('✅ PostgreSQL version:', result.rows[0].version);
    
    const userCheck = await client.query(`
      SELECT COUNT(*) as count FROM "User"
    `);
    console.log('✅ Users in database:', userCheck.rows[0].count);
    
    client.release();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

testConnection();