const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');

async function debugAuth() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const databaseUrl = envContent.split('\n')
    .find(line => line.startsWith('DATABASE_URL='))
    ?.split('=')[1]
    ?.replace(/"/g, '');

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  
  console.log('🔍 Debugging customer portal authentication...\n');

  // Check if user exists
  const userQuery = await client.query(`
    SELECT id, "customerId", email, password, "firstName", "lastName", "isActive"
    FROM "CustomerPortalUser"
    WHERE email = $1
  `, ['john@acmeconstruction.com']);

  if (userQuery.rows.length === 0) {
    console.log('❌ No user found with email: john@acmeconstruction.com');
    await client.end();
    return;
  }

  const user = userQuery.rows[0];
  console.log('✅ User found:');
  console.log('   ID:', user.id);
  console.log('   Customer ID:', user.customerId);
  console.log('   Email:', user.email);
  console.log('   First Name:', user.firstName);
  console.log('   Is Active:', user.isActive);
  console.log('   Password Hash Length:', user.password.length);

  // Test password
  const testPassword = 'SecurePass123';
  console.log('\n🔐 Testing password...');
  console.log('   Test Password:', testPassword);
  
  try {
    const isValidPassword = await bcrypt.compare(testPassword, user.password);
    console.log('   Password Valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('   ❌ Password does not match!');
      
      // Create a new hash to verify bcrypt is working
      const newHash = await bcrypt.hash(testPassword, 12);
      const testNewHash = await bcrypt.compare(testPassword, newHash);
      console.log('   Test New Hash Works:', testNewHash);
    } else {
      console.log('   ✅ Password matches!');
    }
  } catch (error) {
    console.log('   ❌ Error comparing password:', error.message);
  }

  // Check customer exists
  const customerQuery = await client.query(`
    SELECT id, "firstName", "lastName", "companyName"
    FROM "Customer"
    WHERE id = $1
  `, [user.customerId]);

  if (customerQuery.rows.length > 0) {
    console.log('\n✅ Customer found:');
    console.log('   Customer:', customerQuery.rows[0]);
  } else {
    console.log('\n❌ Customer not found with ID:', user.customerId);
  }

  await client.end();
}

debugAuth().catch(console.error);