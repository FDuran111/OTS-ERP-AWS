#!/usr/bin/env node

/**
 * Migration script to transfer users from Supabase to AWS RDS
 * Run this on the ECS container or any environment with RDS access
 */

const { Client } = require('pg');

// Supabase users data exported from the database
const SUPABASE_USERS = [
  {
    id: "0d057afc-a23c-4536-aac0-4eae250d2175",
    email: "tortmeier@windstream.net",
    name: "Charisse Ortmeier",
    password_hash: "$2b$12$blw3kFomQtnhzGDU173YueDWAzbxOL9zM7hoTauyJ9uKcH6iJhTX2",
    active: true,
    created_at: "2025-08-22T13:41:25.812Z",
    updated_at: "2025-08-22T13:41:25.812Z",
    role: "admin",
    phone: "402-657-1933"
  },
  {
    id: "23ff66c1-edf2-44f9-bcd2-c1ef202b6c50",
    email: "admin@admin.com",
    name: "ADMIN",
    password_hash: "$2b$12$PmZtpIgDcfoKrOvvPWb2g.FC0EpCXBljSZQwbnS393bBakNkAbwTK",
    active: true,
    created_at: "2025-06-30T14:09:51.932Z",
    updated_at: "2025-06-30T14:09:51.932Z",
    role: "admin",
    phone: null
  },
  {
    id: "268b52f6-968c-4636-add5-5da92142f8f3",
    email: "rachelortmeier@gmail.com",
    name: "Rachel Erickson",
    password_hash: "$2b$12$mvDAcYf03d1nOY45jAOEI.RulFaa80IpxiMZnDsxmi/I2lD4KYVEu",
    active: true,
    created_at: "2025-08-22T13:39:34.98Z",
    updated_at: "2025-08-22T13:39:34.98Z",
    role: "admin",
    phone: "4025155016"
  },
  {
    id: "30d1c3a5-757f-4e17-b00a-ab58e97d4be7",
    email: "test@email.com",
    name: "Test 1",
    password_hash: "$2b$12$GoZ6A97eZyM//rjtXuelV.u2MTrisfEI1wpM1jJq0ziY3JVUvYM1.",
    active: true,
    created_at: "2025-07-03T17:57:47.855Z",
    updated_at: "2025-07-03T18:56:34.913Z",
    role: "admin",
    phone: null
  },
  {
    id: "739a33a0-a4ca-48b6-962b-2d504ab7d11d",
    email: "Tech@employee.com",
    name: "Tech (Employee)",
    password_hash: "$2b$12$gNosvvgGxRmkSK.LwRXrwut3BOZYCjZzoEfp8PBcw2COCR1nNKbAS",
    active: true,
    created_at: "2025-07-02T16:29:28.064Z",
    updated_at: "2025-07-02T16:29:28.064Z",
    role: "crew",
    phone: null
  },
  {
    id: "84904b97-33e4-4630-97b6-c315d6abb67c",
    email: "Derek@otsinc.com",
    name: "Derek Ortmeier",
    password_hash: "$2b$12$.qsacDo152sNwTb1RBhiU.tgg1mIlW/jI/2Mqdl7.W7FBxbGQ2h9G",
    active: true,
    created_at: "2025-07-03T15:08:17.877Z",
    updated_at: "2025-07-03T15:11:18.875Z",
    role: "admin",
    phone: null
  },
  {
    id: "91d9fe70-d03b-4568-94b0-09e4e8e75057",
    email: "francisco@111consultinggroup.com",
    name: "Francisco Duran (Tech)",
    password_hash: "$2b$12$TmyrUvD3ojIK.H6/3qsp4euDNbKZuPFfsNczIYkc9BAPhyYTO18iu",
    active: false,
    created_at: "2025-06-27T01:47:18.492Z",
    updated_at: "2025-07-02T16:42:02.9Z",
    role: "admin",
    phone: "(760)980-4318"
  },
  {
    id: "a4b0c5ac-1249-4849-ac85-3dc9e8fd8041",
    email: "EMP@test.com",
    name: "Employee",
    password_hash: "$2b$12$zC2wy/sFb9mXxjNGenHrtuIxb5IWMU9siBxSpL.wYDBCuSi0F5cXO",
    active: true,
    created_at: "2025-07-03T18:57:50.516Z",
    updated_at: "2025-07-03T18:57:50.516Z",
    role: "crew",
    phone: null
  },
  {
    id: "cbe9c497-269c-4691-ad33-91d00813cacd",
    email: "tim@otsinc.com",
    name: "Tim Ortmeier",
    password_hash: "$2b$12$oHjobYntgVEar60O1RSJj..HTlIFrRfXgHG9nhlwRa4BcAxRtCHHS",
    active: true,
    created_at: "2025-08-22T13:40:24.518Z",
    updated_at: "2025-08-22T13:40:24.518Z",
    role: "admin",
    phone: "402-607-1111"
  }
];

async function migrateUsers() {
  // Get database URL from environment or use the RDS connection string
  const DATABASE_URL = process.env.DATABASE_URL || 
    'postgresql://postgres:Ortmeier123!@ots-erp-prod-rds.c5cymmac2hya.us-east-2.rds.amazonaws.com:5432/ortmeier?sslmode=require';

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to RDS database...');
    await client.connect();
    console.log('Connected successfully!');

    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Creating users table...');
      await client.query(`
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255),
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'crew',
          phone VARCHAR(50),
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_users_email ON users(email);
        CREATE INDEX idx_users_role ON users(role);
      `);
      console.log('Users table created successfully!');
    }

    // Check current user count
    const countResult = await client.query('SELECT COUNT(*) FROM users');
    const currentCount = parseInt(countResult.rows[0].count);
    console.log(`Current user count: ${currentCount}`);

    if (currentCount > 0) {
      console.log('Warning: Users table already contains data. Proceeding with upsert...');
    }

    // Migrate each user
    console.log(`\nMigrating ${SUPABASE_USERS.length} users...`);
    
    for (const user of SUPABASE_USERS) {
      try {
        // Use UPSERT (INSERT ... ON CONFLICT) to handle existing records
        const result = await client.query(`
          INSERT INTO users (
            id, email, name, password_hash, role, phone, active, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
          )
          ON CONFLICT (email) 
          DO UPDATE SET
            name = EXCLUDED.name,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            phone = EXCLUDED.phone,
            active = EXCLUDED.active,
            updated_at = CURRENT_TIMESTAMP
          RETURNING email, name;
        `, [
          user.id,
          user.email.toLowerCase(), // Normalize email to lowercase
          user.name,
          user.password_hash,
          user.role.toLowerCase().includes('owner') || user.role.toLowerCase().includes('admin') ? 'admin' : 
            user.role.toLowerCase().includes('employee') || user.role.toLowerCase().includes('crew') ? 'crew' : 
            user.role.toLowerCase(),
          user.phone,
          user.active,
          user.created_at,
          user.updated_at
        ]);
        
        console.log(`✅ Migrated: ${result.rows[0].email} (${result.rows[0].name})`);
      } catch (err) {
        console.error(`❌ Failed to migrate ${user.email}:`, err.message);
      }
    }

    // Verify migration
    const finalCount = await client.query('SELECT COUNT(*) FROM users');
    console.log(`\nMigration complete! Total users in RDS: ${finalCount.rows[0].count}`);

    // List all users
    const allUsers = await client.query('SELECT email, name, role, active FROM users ORDER BY created_at');
    console.log('\nMigrated users:');
    allUsers.rows.forEach(u => {
      console.log(`  - ${u.email} (${u.name}) - Role: ${u.role}, Active: ${u.active}`);
    });

  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run migration
migrateUsers().catch(console.error);