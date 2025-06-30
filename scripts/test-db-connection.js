const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testConnection() {
  console.log('Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Connected to database successfully!');
    
    // Test query
    const result = await client.query('SELECT NOW()');
    console.log('✅ Query test passed. Current time:', result.rows[0].now);
    
    // Check if User table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'User'
      )
    `);
    console.log('✅ User table exists:', tableCheck.rows[0].exists);
    
    // Check for users
    const userCount = await client.query('SELECT COUNT(*) FROM "User"');
    console.log('✅ Number of users in database:', userCount.rows[0].count);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await pool.end();
  }
}

testConnection();