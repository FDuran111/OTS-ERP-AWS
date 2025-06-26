const { Client } = require('pg');
const fs = require('fs');

async function checkSchema() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const databaseUrl = envContent.split('\n')
    .find(line => line.startsWith('DATABASE_URL='))
    ?.split('=')[1]
    ?.replace(/"/g, '');

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  
  // Check Customer table columns
  const customerCols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'Customer' 
    ORDER BY ordinal_position
  `);
  
  console.log('Customer table columns:');
  customerCols.rows.forEach(col => {
    console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
  });

  // Check if any customers exist
  const customers = await client.query('SELECT id FROM "Customer" LIMIT 5');
  console.log(`\nExisting customers (${customers.rows.length}):`);
  customers.rows.forEach(c => console.log(`  ${c.id}`));
  
  await client.end();
}

checkSchema().catch(console.error);