import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Supabase users data with correct password hashes
const SUPABASE_USERS = [
  {
    email: "admin@admin.com",
    name: "ADMIN",
    password: "$2b$12$PmZtpIgDcfoKrOvvPWb2g.FC0EpCXBljSZQwbnS393bBakNkAbwTK", // OTS123
    role: "OWNER_ADMIN"
  },
  {
    email: "tortmeier@windstream.net",
    name: "Charisse Ortmeier",
    password: "$2b$12$blw3kFomQtnhzGDU173YueDWAzbxOL9zM7hoTauyJ9uKcH6iJhTX2",
    role: "OWNER_ADMIN"
  },
  {
    email: "rachelortmeier@gmail.com",
    name: "Rachel Erickson",
    password: "$2b$12$mvDAcYf03d1nOY45jAOEI.RulFaa80IpxiMZnDsxmi/I2lD4KYVEu",
    role: "OWNER_ADMIN"
  },
  {
    email: "Derek@otsinc.com",
    name: "Derek Ortmeier",
    password: "$2b$12$.qsacDo152sNwTb1RBhiU.tgg1mIlW/jI/2Mqdl7.W7FBxbGQ2h9G",
    role: "OWNER_ADMIN"
  },
  {
    email: "tim@otsinc.com",
    name: "Tim Ortmeier",
    password: "$2b$12$oHjobYntgVEar60O1RSJj..HTlIFrRfXgHG9nhlwRa4BcAxRtCHHS",
    role: "OWNER_ADMIN"
  },
  {
    email: "test@email.com",
    name: "Test 1",
    password: "$2b$12$GoZ6A97eZyM//rjtXuelV.u2MTrisfEI1wpM1jJq0ziY3JVUvYM1.",
    role: "OWNER_ADMIN"
  },
  {
    email: "francisco@111consultinggroup.com",
    name: "Francisco Duran (Tech)",
    password: "$2b$12$TmyrUvD3ojIK.H6/3qsp4euDNbKZuPFfsNczIYkc9BAPhyYTO18iu",
    role: "OWNER_ADMIN"
  },
  {
    email: "Tech@employee.com",
    name: "Tech (Employee)",
    password: "$2b$12$gNosvvgGxRmkSK.LwRXrwut3BOZYCjZzoEfp8PBcw2COCR1nNKbAS",
    role: "EMPLOYEE"
  },
  {
    email: "EMP@test.com",
    name: "Employee",
    password: "$2b$12$zC2wy/sFb9mXxjNGenHrtuIxb5IWMU9siBxSpL.wYDBCuSi0F5cXO",
    role: "EMPLOYEE"
  }
];

export async function GET() {
  try {
    console.log('Starting final user migration to User table...');
    
    const results = {
      migrated: [],
      failed: [],
      errors: []
    };

    // Clear existing User table except for any system users
    await query('DELETE FROM "User" WHERE email != \'system@local\'');
    
    // Migrate each user to the User table
    for (const user of SUPABASE_USERS) {
      try {
        const result = await query(`
          INSERT INTO "User" (email, name, password, role, active)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (email) 
          DO UPDATE SET
            name = EXCLUDED.name,
            password = EXCLUDED.password,
            role = EXCLUDED.role,
            active = EXCLUDED.active
          RETURNING email, name, role;
        `, [
          user.email.toLowerCase(),
          user.name,
          user.password,
          user.role,
          true
        ]);
        
        results.migrated.push({
          email: result.rows[0].email,
          name: result.rows[0].name,
          role: result.rows[0].role
        });
      } catch (err: any) {
        results.failed.push(user.email);
        results.errors.push(`${user.email}: ${err.message}`);
      }
    }

    // List all users in User table
    const allUsers = await query('SELECT email, name, role, active FROM "User" ORDER BY email');
    
    return NextResponse.json({
      success: true,
      message: `Migration complete! Migrated ${results.migrated.length} users to User table`,
      migrated: results.migrated,
      failed: results.failed,
      errors: results.errors,
      all_users: allUsers.rows
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      detail: error.detail || 'No details'
    }, { status: 500 });
  }
}