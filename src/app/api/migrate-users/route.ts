import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Supabase users data
const SUPABASE_USERS = [
  {
    id: "0d057afc-a23c-4536-aac0-4eae250d2175",
    email: "tortmeier@windstream.net",
    name: "Charisse Ortmeier",
    password_hash: "$2b$12$blw3kFomQtnhzGDU173YueDWAzbxOL9zM7hoTauyJ9uKcH6iJhTX2",
    role: "admin",
    phone: "402-657-1933"
  },
  {
    id: "23ff66c1-edf2-44f9-bcd2-c1ef202b6c50",
    email: "admin@admin.com",
    name: "ADMIN",
    password_hash: "$2b$12$PmZtpIgDcfoKrOvvPWb2g.FC0EpCXBljSZQwbnS393bBakNkAbwTK",
    role: "admin",
    phone: null
  },
  {
    id: "268b52f6-968c-4636-add5-5da92142f8f3",
    email: "rachelortmeier@gmail.com",
    name: "Rachel Erickson",
    password_hash: "$2b$12$mvDAcYf03d1nOY45jAOEI.RulFaa80IpxiMZnDsxmi/I2lD4KYVEu",
    role: "admin",
    phone: "4025155016"
  },
  {
    id: "30d1c3a5-757f-4e17-b00a-ab58e97d4be7",
    email: "test@email.com",
    name: "Test 1",
    password_hash: "$2b$12$GoZ6A97eZyM//rjtXuelV.u2MTrisfEI1wpM1jJq0ziY3JVUvYM1.",
    role: "admin",
    phone: null
  },
  {
    id: "739a33a0-a4ca-48b6-962b-2d504ab7d11d",
    email: "Tech@employee.com",
    name: "Tech (Employee)",
    password_hash: "$2b$12$gNosvvgGxRmkSK.LwRXrwut3BOZYCjZzoEfp8PBcw2COCR1nNKbAS",
    role: "crew",
    phone: null
  },
  {
    id: "84904b97-33e4-4630-97b6-c315d6abb67c",
    email: "Derek@otsinc.com",
    name: "Derek Ortmeier",
    password_hash: "$2b$12$.qsacDo152sNwTb1RBhiU.tgg1mIlW/jI/2Mqdl7.W7FBxbGQ2h9G",
    role: "admin",
    phone: null
  },
  {
    id: "91d9fe70-d03b-4568-94b0-09e4e8e75057",
    email: "francisco@111consultinggroup.com",
    name: "Francisco Duran (Tech)",
    password_hash: "$2b$12$TmyrUvD3ojIK.H6/3qsp4euDNbKZuPFfsNczIYkc9BAPhyYTO18iu",
    role: "admin",
    phone: "(760)980-4318"
  },
  {
    id: "a4b0c5ac-1249-4849-ac85-3dc9e8fd8041",
    email: "EMP@test.com",
    name: "Employee",
    password_hash: "$2b$12$zC2wy/sFb9mXxjNGenHrtuIxb5IWMU9siBxSpL.wYDBCuSi0F5cXO",
    role: "crew",
    phone: null
  },
  {
    id: "cbe9c497-269c-4691-ad33-91d00813cacd",
    email: "tim@otsinc.com",
    name: "Tim Ortmeier",
    password_hash: "$2b$12$oHjobYntgVEar60O1RSJj..HTlIFrRfXgHG9nhlwRa4BcAxRtCHHS",
    role: "admin",
    phone: "402-607-1111"
  }
];

export async function GET() {
  try {
    console.log('Starting user migration from Supabase to RDS...');
    
    // Check if users table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('Creating users table...');
      await query(`
        CREATE TABLE IF NOT EXISTS users (
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
        
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      `);
    }

    // Check current user count
    const countResult = await query('SELECT COUNT(*) FROM users');
    const currentCount = parseInt(countResult.rows[0].count);
    
    const results = {
      before_count: currentCount,
      migrated: [],
      failed: [],
      errors: []
    };

    // Migrate each user
    for (const user of SUPABASE_USERS) {
      try {
        // Use UPSERT to handle existing records
        const result = await query(`
          INSERT INTO users (
            id, email, name, password_hash, role, phone, active, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8::timestamp, $9::timestamp
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
          user.email.toLowerCase(),
          user.name,
          user.password_hash,
          user.role,
          user.phone,
          true, // active
          new Date(),
          new Date()
        ]);
        
        results.migrated.push({
          email: result.rows[0].email,
          name: result.rows[0].name
        });
      } catch (err: any) {
        results.failed.push(user.email);
        results.errors.push(`${user.email}: ${err.message}`);
      }
    }

    // Get final count
    const finalCount = await query('SELECT COUNT(*) FROM users');
    results.after_count = parseInt(finalCount.rows[0].count);

    // List all users
    const allUsers = await query('SELECT email, name, role, active FROM users ORDER BY created_at');
    results.users = allUsers.rows;

    return NextResponse.json({
      success: true,
      message: `Migration complete! Migrated ${results.migrated.length} users`,
      ...results
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}