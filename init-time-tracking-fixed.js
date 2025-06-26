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
    
    await client.query(`
      DO $$ BEGIN
          CREATE TYPE break_type AS ENUM ('LUNCH', 'SHORT_BREAK', 'PERSONAL', 'MEETING', 'TRAVEL', 'OTHER');
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
          "endDate" date,
          "isActive" boolean DEFAULT true,
          "weeklySchedule" jsonb NOT NULL DEFAULT '{}',
          "regularRate" decimal(10, 2) NOT NULL,
          "overtimeRate" decimal(10, 2),
          "doubleTimeRate" decimal(10, 2),
          "isExempt" boolean DEFAULT false,
          "isPieceWork" boolean DEFAULT false,
          "isContractor" boolean DEFAULT false,
          notes text,
          "createdAt" timestamp NOT NULL DEFAULT NOW(),
          "updatedAt" timestamp NOT NULL DEFAULT NOW()
      );
    `)
    
    console.log('Creating TimeEntry table...')
    
    // Create main time entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TimeEntry" (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
          "employeeScheduleId" uuid REFERENCES "EmployeeSchedule"(id) ON DELETE SET NULL,
          
          -- Time tracking
          "clockInTime" timestamp NOT NULL,
          "clockOutTime" timestamp,
          "totalHours" decimal(8, 4),
          "regularHours" decimal(8, 4) DEFAULT 0,
          "overtimeHours" decimal(8, 4) DEFAULT 0,
          "doubleTimeHours" decimal(8, 4) DEFAULT 0,
          "breakMinutes" integer DEFAULT 0,
          
          -- Job assignment
          "jobId" text REFERENCES "Job"(id) ON DELETE SET NULL,
          "serviceCallId" uuid REFERENCES "ServiceCall"(id) ON DELETE SET NULL,
          "jobPhaseId" text REFERENCES "JobPhase"(id) ON DELETE SET NULL,
          "workDescription" text,
          
          -- Location tracking
          "clockInLatitude" decimal(10, 8),
          "clockInLongitude" decimal(11, 8),
          "clockOutLatitude" decimal(10, 8),
          "clockOutLongitude" decimal(11, 8),
          "workSiteAddress" text,
          
          -- Status and approval
          status time_entry_status DEFAULT 'ACTIVE',
          "isManualEntry" boolean DEFAULT false,
          "enteredBy" text REFERENCES "User"(id) ON DELETE SET NULL,
          "approvedBy" text REFERENCES "User"(id) ON DELETE SET NULL,
          "approvedAt" timestamp,
          "approvalNotes" text,
          
          -- Rate information (locked when approved)
          "appliedRegularRate" decimal(10, 2),
          "appliedOvertimeRate" decimal(10, 2),
          "appliedDoubleTimeRate" decimal(10, 2),
          "regularPay" decimal(12, 2),
          "overtimePay" decimal(12, 2),
          "doubleTimePay" decimal(12, 2),
          "totalPay" decimal(12, 2),
          
          notes text,
          "createdAt" timestamp NOT NULL DEFAULT NOW(),
          "updatedAt" timestamp NOT NULL DEFAULT NOW()
      );
    `)
    
    console.log('Creating TimeEntryBreak table...')
    
    // Create break tracking table (without foreign key initially)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TimeEntryBreak" (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "timeEntryId" uuid NOT NULL,
          "breakType" break_type NOT NULL DEFAULT 'SHORT_BREAK',
          "startTime" timestamp NOT NULL,
          "endTime" timestamp,
          "durationMinutes" integer,
          "isPaid" boolean DEFAULT true,
          "isDeducted" boolean DEFAULT false,
          latitude decimal(10, 8),
          longitude decimal(11, 8),
          notes text,
          "createdAt" timestamp NOT NULL DEFAULT NOW()
      );
    `)
    
    console.log('Adding foreign key constraint to TimeEntryBreak...')
    
    // Add the foreign key constraint
    await client.query(`
      ALTER TABLE "TimeEntryBreak" 
      ADD CONSTRAINT "TimeEntryBreak_timeEntryId_fkey" 
      FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry"(id) ON DELETE CASCADE;
    `)
    
    console.log('Creating JobLaborActual table...')
    
    // Create job labor actual tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS "JobLaborActual" (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "jobId" text NOT NULL REFERENCES "Job"(id) ON DELETE CASCADE,
          "jobPhaseId" text REFERENCES "JobPhase"(id) ON DELETE CASCADE,
          "timeEntryId" uuid NOT NULL REFERENCES "TimeEntry"(id) ON DELETE CASCADE,
          "userId" text NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
          "actualHours" decimal(8, 4) NOT NULL,
          "actualCost" decimal(12, 2) NOT NULL,
          "burdenedCost" decimal(12, 2),
          "billableHours" decimal(8, 4),
          "billableRate" decimal(10, 2),
          "billableAmount" decimal(12, 2),
          "workType" varchar(100),
          "skillLevel" varchar(50),
          "taskDescription" text,
          "dateWorked" date NOT NULL,
          "createdAt" timestamp NOT NULL DEFAULT NOW(),
          UNIQUE("timeEntryId")
      );
    `)
    
    console.log('Creating indexes...')
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_time_entry_user_date ON "TimeEntry"("userId", "clockInTime");
      CREATE INDEX IF NOT EXISTS idx_time_entry_job ON "TimeEntry"("jobId", "clockInTime");
      CREATE INDEX IF NOT EXISTS idx_time_entry_status ON "TimeEntry"(status, "clockInTime");
      CREATE INDEX IF NOT EXISTS idx_time_entry_active ON "TimeEntry"("userId") WHERE status = 'ACTIVE';
      CREATE INDEX IF NOT EXISTS idx_employee_schedule_user ON "EmployeeSchedule"("userId", "effectiveDate");
      CREATE INDEX IF NOT EXISTS idx_employee_schedule_active ON "EmployeeSchedule"("userId") WHERE "isActive" = true;
      CREATE INDEX IF NOT EXISTS idx_job_labor_actual_job ON "JobLaborActual"("jobId", "dateWorked");
      CREATE INDEX IF NOT EXISTS idx_job_labor_actual_user ON "JobLaborActual"("userId", "dateWorked");
      CREATE INDEX IF NOT EXISTS idx_time_entry_break_entry ON "TimeEntryBreak"("timeEntryId", "startTime");
    `)
    
    console.log('✅ Time tracking system initialized successfully!')
    
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