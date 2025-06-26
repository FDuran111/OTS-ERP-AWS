const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');

async function createTestUsers() {
  // Read DATABASE_URL from .env.local
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const databaseUrl = envContent.split('\n')
    .find(line => line.startsWith('DATABASE_URL='))
    ?.split('=')[1]
    ?.replace(/"/g, '');

  if (!databaseUrl) {
    throw new Error('DATABASE_URL not found in .env.local');
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('Connected to database');

    // Use an existing customer
    const existingCustomer = await client.query('SELECT id FROM "Customer" LIMIT 1');
    const customerId = existingCustomer.rows[0]?.id;
    
    if (!customerId) {
      throw new Error('No customers found in database. Please create a customer first.');
    }
    
    console.log('Using existing customer:', customerId);

    // Create customer portal user
    const hashedPassword = await bcrypt.hash('SecurePass123', 12);
    
    const userResult = await client.query(`
      INSERT INTO "CustomerPortalUser" (
        "customerId", 
        email, 
        password, 
        "firstName", 
        "lastName", 
        "isActive", 
        "isEmailVerified"
      ) VALUES (
        $1,
        'john@acmeconstruction.com',
        $2,
        'John',
        'Smith',
        true,
        true
      )
      ON CONFLICT (email) DO UPDATE SET
        password = $2,
        "firstName" = 'John',
        "lastName" = 'Smith'
      RETURNING id, email, "customerId"
    `, [customerId, hashedPassword]);

    console.log('Created customer portal user:', userResult.rows[0]);

    // Create preferences for the user
    await client.query(`
      INSERT INTO "CustomerPortalPreferences" ("userId")
      VALUES ($1)
      ON CONFLICT ("userId") DO NOTHING
    `, [userResult.rows[0].id]);

    console.log('Created user preferences');

    console.log('\\n✅ Test setup complete!');
    console.log('You can now login with:');
    console.log('  Email: john@acmeconstruction.com');
    console.log('  Password: SecurePass123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

createTestUsers();