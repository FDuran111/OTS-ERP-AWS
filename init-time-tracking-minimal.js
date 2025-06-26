const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres.xudcmdliqyarbfdqufbq:tucbE1-dumqap-cynpyx@aws-0-us-east-2.pooler.supabase.com:6543/postgres'
})

async function initializeTimeTracking() {
  const client = await pool.connect()
  
  try {
    console.log('Creating time tracking enums...')
    
    // Create basic enums
    await client.query(`
      DO $$ BEGIN
          CREATE TYPE time_entry_status AS ENUM ('ACTIVE', 'COMPLETED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `)
    
    console.log('Creating EmployeeSchedule table...')
    
    // Create employee schedule table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "EmployeeSchedule" (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
          "effectiveDate" date NOT NULL,
          "regularRate" decimal(10, 2) NOT NULL,
          "overtimeRate" decimal(10, 2),
          "isActive" boolean DEFAULT true,
          "createdAt" timestamp NOT NULL DEFAULT NOW()
      );
    `)
    
    console.log('Creating TimeEntry table...')
    
    // Create main time entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TimeEntry" (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
          "clockInTime" timestamp NOT NULL,
          "clockOutTime" timestamp,
          "totalHours" decimal(8, 4),
          "regularHours" decimal(8, 4) DEFAULT 0,
          "overtimeHours" decimal(8, 4) DEFAULT 0,
          "jobId" text REFERENCES "Job"(id) ON DELETE SET NULL,
          status time_entry_status DEFAULT 'ACTIVE',
          "appliedRegularRate" decimal(10, 2),
          "totalPay" decimal(12, 2),
          "createdAt" timestamp NOT NULL DEFAULT NOW()
      );
    `)
    
    console.log('Creating JobLaborActual table...')
    
    // Create job labor actual tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS "JobLaborActual" (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "jobId" text NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
          "timeEntryId" uuid NOT NULL,
          "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
          "actualHours" decimal(8, 4) NOT NULL,
          "actualCost" decimal(12, 2) NOT NULL,
          "dateWorked" date NOT NULL,
          "createdAt" timestamp NOT NULL DEFAULT NOW()
      );
    `)
    
    console.log('✅ Minimal time tracking system initialized successfully!')
    
  } catch (error) {
    console.error('❌ Error initializing time tracking:', error.message)
    throw error
  } finally {
    client.release()
  }
}

async function main() {
  try {
    await initializeTimeTracking()
  } catch (error) {
    console.error('Failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()