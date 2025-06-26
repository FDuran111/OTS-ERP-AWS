const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');

async function testCustomerAuth() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const databaseUrl = envContent.split('\n')
    .find(line => line.startsWith('DATABASE_URL='))
    ?.split('=')[1]
    ?.replace(/"/g, '');

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  
  console.log('🔍 Testing the exact same query as customer-auth.ts...\n');

  // Test exact query from customer-auth.ts
  const result = await client.query(`
    SELECT 
      cpu.*,
      c.id as "customer_id",
      c."firstName" as "customer_firstName",
      c."lastName" as "customer_lastName", 
      c."companyName" as "customer_companyName",
      c.phone as "customer_phone",
      c.email as "customer_email",
      c.address as "customer_address",
      c.city as "customer_city",
      c.state as "customer_state",
      c.zip as "customer_zip"
    FROM "CustomerPortalUser" cpu
    JOIN "Customer" c ON cpu."customerId" = c.id
    WHERE cpu.email = $1 AND cpu."isActive" = true
  `, ['john@acmeconstruction.com']);

  console.log('📊 Query Results:');
  console.log('   Rows found:', result.rows.length);
  
  if (result.rows.length === 0) {
    console.log('❌ No user found with the join query');
    
    // Test individual tables
    const userOnly = await client.query('SELECT * FROM "CustomerPortalUser" WHERE email = $1', ['john@acmeconstruction.com']);
    console.log('   User table only:', userOnly.rows.length, 'rows');
    
    if (userOnly.rows.length > 0) {
      const user = userOnly.rows[0];
      console.log('   Customer ID from user:', user.customerId);
      
      const customer = await client.query('SELECT * FROM "Customer" WHERE id = $1', [user.customerId]);
      console.log('   Customer found:', customer.rows.length, 'rows');
      if (customer.rows.length > 0) {
        console.log('   Customer data:', customer.rows[0]);
      }
    }
    
    await client.end();
    return;
  }

  const userData = result.rows[0];
  console.log('✅ User found in join query');
  console.log('   Email:', userData.email);
  console.log('   Active:', userData.isActive);
  console.log('   Customer ID:', userData.customerId);
  console.log('   Customer Name:', userData.customer_firstName, userData.customer_lastName);

  // Test password
  const testPassword = 'SecurePass123';
  console.log('\n🔐 Testing password comparison...');
  
  try {
    const isValid = await bcrypt.compare(testPassword, userData.password);
    console.log('   Password Valid:', isValid);
    
    if (isValid) {
      console.log('✅ Authentication should work!');
    } else {
      console.log('❌ Password comparison failed');
      console.log('   Stored hash:', userData.password.substring(0, 20) + '...');
      console.log('   Hash length:', userData.password.length);
    }
  } catch (error) {
    console.log('❌ Error during password comparison:', error.message);
  }

  await client.end();
}

testCustomerAuth().catch(console.error);