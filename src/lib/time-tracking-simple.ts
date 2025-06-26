import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export interface TimeEntry {
  id?: string
  userId: string
  jobId?: string
  serviceCallId?: string
  jobPhaseId?: string
  clockInTime: string
  clockOutTime?: string
  totalHours?: number
  regularHours?: number
  overtimeHours?: number
  breakMinutes?: number
  workDescription?: string
  clockInLatitude?: number
  clockInLongitude?: number
  clockOutLatitude?: number
  clockOutLongitude?: number
  workSiteAddress?: string
  status: 'ACTIVE' | 'COMPLETED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
  appliedRegularRate?: number
  appliedOvertimeRate?: number
  totalPay?: number
  notes?: string
  createdAt?: string
  updatedAt?: string
}

export interface EmployeeSchedule {
  id?: string
  userId: string
  effectiveDate: string
  endDate?: string
  isActive: boolean
  weeklySchedule: any
  regularRate: number
  overtimeRate?: number
  isExempt?: boolean
  notes?: string
  createdAt?: string
  updatedAt?: string
}

// Initialize the basic time tracking system
export async function initializeTimeTracking() {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
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
    
    // Create break tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "TimeEntryBreak" (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "timeEntryId" uuid NOT NULL REFERENCES "TimeEntry"(id) ON DELETE CASCADE,
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
          "createdAt" timestamp NOT NULL DEFAULT NOW()
      );
    `)
    
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
    `)
    
    await client.query('COMMIT')
    console.log('Basic time tracking system initialized successfully')
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Clock in function
export async function clockIn(
  userId: string, 
  jobId?: string, 
  latitude?: number, 
  longitude?: number,
  workSiteAddress?: string
): Promise<TimeEntry> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Check if user already has an active time entry
    const activeCheck = await client.query(`
      SELECT id FROM "TimeEntry" 
      WHERE "userId" = $1 AND status = 'ACTIVE'
    `, [userId])
    
    if (activeCheck.rows.length > 0) {
      throw new Error('User already has an active time entry')
    }
    
    // Get employee schedule for rate information
    const scheduleResult = await client.query(`
      SELECT * FROM "EmployeeSchedule" 
      WHERE "userId" = $1 AND "isActive" = true 
      AND "effectiveDate" <= CURRENT_DATE
      AND ("endDate" IS NULL OR "endDate" >= CURRENT_DATE)
      ORDER BY "effectiveDate" DESC 
      LIMIT 1
    `, [userId])
    
    const schedule = scheduleResult.rows[0]
    
    // Create time entry
    const result = await client.query(`
      INSERT INTO "TimeEntry" (
        "userId", "employeeScheduleId", "clockInTime", "jobId", 
        "clockInLatitude", "clockInLongitude", "workSiteAddress",
        "appliedRegularRate", "appliedOvertimeRate"
      ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      userId, 
      schedule?.id || null, 
      jobId || null, 
      latitude || null, 
      longitude || null, 
      workSiteAddress || null,
      schedule?.regularRate || 0,
      schedule?.overtimeRate || (schedule?.regularRate * 1.5) || 0
    ])
    
    await client.query('COMMIT')
    return result.rows[0]
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Clock out function
export async function clockOut(
  userId: string, 
  latitude?: number, 
  longitude?: number,
  workDescription?: string,
  notes?: string
): Promise<TimeEntry> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Find active time entry
    const activeResult = await client.query(`
      SELECT * FROM "TimeEntry" 
      WHERE "userId" = $1 AND status = 'ACTIVE'
    `, [userId])
    
    if (activeResult.rows.length === 0) {
      throw new Error('No active time entry found for user')
    }
    
    const timeEntry = activeResult.rows[0]
    
    // Calculate total hours and break time
    const breakResult = await client.query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN "endTime" IS NOT NULL THEN 
            EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60
          ELSE 0
        END
      ), 0) as total_break_minutes
      FROM "TimeEntryBreak"
      WHERE "timeEntryId" = $1 AND "isDeducted" = true
    `, [timeEntry.id])
    
    const breakMinutes = parseInt(breakResult.rows[0].total_break_minutes || 0)
    
    // Update time entry with clock out
    const updateResult = await client.query(`
      UPDATE "TimeEntry" 
      SET 
        "clockOutTime" = NOW(),
        "clockOutLatitude" = $1,
        "clockOutLongitude" = $2,
        "workDescription" = $3,
        notes = $4,
        "breakMinutes" = $5,
        status = 'COMPLETED',
        "updatedAt" = NOW()
      WHERE id = $6
      RETURNING *
    `, [latitude, longitude, workDescription, notes, breakMinutes, timeEntry.id])
    
    const updatedEntry = updateResult.rows[0]
    
    // Calculate hours and pay
    const totalMinutes = Math.floor((new Date(updatedEntry.clockOutTime).getTime() - new Date(updatedEntry.clockInTime).getTime()) / 60000)
    const netMinutes = totalMinutes - breakMinutes
    const netHours = netMinutes / 60.0
    
    // Simple overtime calculation (over 8 hours)
    const regularHours = Math.min(netHours, 8)
    const overtimeHours = Math.max(0, netHours - 8)
    
    const regularPay = regularHours * (updatedEntry.appliedRegularRate || 0)
    const overtimePay = overtimeHours * (updatedEntry.appliedOvertimeRate || 0)
    const totalPay = regularPay + overtimePay
    
    // Update calculated values
    await client.query(`
      UPDATE "TimeEntry" 
      SET 
        "totalHours" = $1,
        "regularHours" = $2,
        "overtimeHours" = $3,
        "regularPay" = $4,
        "overtimePay" = $5,
        "totalPay" = $6,
        "updatedAt" = NOW()
      WHERE id = $7
    `, [netHours, regularHours, overtimeHours, regularPay, overtimePay, totalPay, timeEntry.id])
    
    // Create job labor actual record if job assigned
    if (updatedEntry.jobId) {
      await client.query(`
        INSERT INTO "JobLaborActual" (
          "jobId", "jobPhaseId", "timeEntryId", "userId",
          "actualHours", "actualCost", "burdenedCost",
          "billableHours", "billableRate", "dateWorked"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT ("timeEntryId") DO UPDATE SET
          "actualHours" = EXCLUDED."actualHours",
          "actualCost" = EXCLUDED."actualCost",
          "burdenedCost" = EXCLUDED."burdenedCost"
      `, [
        updatedEntry.jobId,
        updatedEntry.jobPhaseId,
        timeEntry.id,
        userId,
        netHours,
        totalPay,
        totalPay * 1.30, // 30% burden
        netHours, // Default billable = actual
        (updatedEntry.appliedRegularRate || 0) * 1.5, // 50% markup
        new Date().toISOString().split('T')[0] // Today's date
      ])
    }
    
    await client.query('COMMIT')
    
    // Return updated entry
    const finalResult = await client.query(`
      SELECT * FROM "TimeEntry" WHERE id = $1
    `, [timeEntry.id])
    
    return finalResult.rows[0]
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Start break
export async function startBreak(
  userId: string, 
  breakType: 'LUNCH' | 'SHORT_BREAK' | 'PERSONAL' | 'MEETING' | 'TRAVEL' | 'OTHER' = 'SHORT_BREAK',
  latitude?: number,
  longitude?: number
): Promise<any> {
  // Find active time entry
  const activeResult = await pool.query(`
    SELECT * FROM "TimeEntry" 
    WHERE "userId" = $1 AND status = 'ACTIVE'
  `, [userId])
  
  if (activeResult.rows.length === 0) {
    throw new Error('No active time entry found for user')
  }
  
  const timeEntry = activeResult.rows[0]
  
  // Check if already on break
  const activeBreakResult = await pool.query(`
    SELECT id FROM "TimeEntryBreak" 
    WHERE "timeEntryId" = $1 AND "endTime" IS NULL
  `, [timeEntry.id])
  
  if (activeBreakResult.rows.length > 0) {
    throw new Error('User is already on break')
  }
  
  // Create break record
  const result = await pool.query(`
    INSERT INTO "TimeEntryBreak" (
      "timeEntryId", "breakType", "startTime", latitude, longitude,
      "isPaid", "isDeducted"
    ) VALUES ($1, $2, NOW(), $3, $4, $5, $6)
    RETURNING *
  `, [
    timeEntry.id, 
    breakType, 
    latitude, 
    longitude,
    breakType === 'SHORT_BREAK', // Short breaks are typically paid
    breakType === 'LUNCH' // Lunch is typically deducted
  ])
  
  return result.rows[0]
}

// End break
export async function endBreak(userId: string): Promise<any> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Find active time entry
    const activeResult = await client.query(`
      SELECT * FROM "TimeEntry" 
      WHERE "userId" = $1 AND status = 'ACTIVE'
    `, [userId])
    
    if (activeResult.rows.length === 0) {
      throw new Error('No active time entry found for user')
    }
    
    const timeEntry = activeResult.rows[0]
    
    // Find active break
    const activeBreakResult = await client.query(`
      SELECT * FROM "TimeEntryBreak" 
      WHERE "timeEntryId" = $1 AND "endTime" IS NULL
      ORDER BY "startTime" DESC
      LIMIT 1
    `, [timeEntry.id])
    
    if (activeBreakResult.rows.length === 0) {
      throw new Error('No active break found for user')
    }
    
    const breakRecord = activeBreakResult.rows[0]
    
    // Update break with end time
    const result = await client.query(`
      UPDATE "TimeEntryBreak" 
      SET "endTime" = NOW()
      WHERE id = $1
      RETURNING *
    `, [breakRecord.id])
    
    await client.query('COMMIT')
    return result.rows[0]
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Get active time entry for user
export async function getActiveTimeEntry(userId: string): Promise<TimeEntry | null> {
  const result = await pool.query(`
    SELECT te.*, 
           j."jobNumber", j.description as "jobDescription",
           sc."callNumber", sc.title as "serviceCallTitle",
           jp.name as "jobPhaseName"
    FROM "TimeEntry" te
    LEFT JOIN "Job" j ON te."jobId" = j.id
    LEFT JOIN "ServiceCall" sc ON te."serviceCallId" = sc.id
    LEFT JOIN "JobPhase" jp ON te."jobPhaseId" = jp.id
    WHERE te."userId" = $1 AND te.status = 'ACTIVE'
  `, [userId])
  
  return result.rows[0] || null
}

// Get time entries for user (with pagination)
export async function getUserTimeEntries(
  userId: string, 
  startDate?: string, 
  endDate?: string, 
  limit: number = 50
): Promise<TimeEntry[]> {
  let query = `
    SELECT te.*, 
           j."jobNumber", j.description as "jobDescription",
           sc."callNumber", sc.title as "serviceCallTitle",
           jp.name as "jobPhaseName"
    FROM "TimeEntry" te
    LEFT JOIN "Job" j ON te."jobId" = j.id
    LEFT JOIN "ServiceCall" sc ON te."serviceCallId" = sc.id
    LEFT JOIN "JobPhase" jp ON te."jobPhaseId" = jp.id
    WHERE te."userId" = $1
  `
  
  const values = [userId]
  let paramIndex = 2
  
  if (startDate) {
    query += ` AND te."clockInTime" >= $${paramIndex}`
    values.push(startDate)
    paramIndex++
  }
  
  if (endDate) {
    query += ` AND te."clockInTime" <= $${paramIndex}`
    values.push(endDate)
    paramIndex++
  }
  
  query += ` ORDER BY te."clockInTime" DESC LIMIT $${paramIndex}`
  values.push(limit)
  
  const result = await pool.query(query, values)
  return result.rows
}

// Get time tracking stats for job
export async function getJobTimeStats(jobId: string) {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as "totalEntries",
      SUM("totalHours") as "totalHours",
      SUM("regularHours") as "totalRegularHours", 
      SUM("overtimeHours") as "totalOvertimeHours",
      SUM("totalPay") as "totalCost",
      AVG("totalHours") as "avgHoursPerEntry",
      COUNT(DISTINCT "userId") as "uniqueWorkers"
    FROM "TimeEntry"
    WHERE "jobId" = $1 AND status != 'ACTIVE'
  `, [jobId])
  
  return result.rows[0]
}

// Create or update employee schedule
export async function upsertEmployeeSchedule(schedule: EmployeeSchedule): Promise<EmployeeSchedule> {
  const query = `
    INSERT INTO "EmployeeSchedule" (
      "userId", "effectiveDate", "endDate", "isActive", "weeklySchedule",
      "regularRate", "overtimeRate", "isExempt", notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT ("userId", "effectiveDate") 
    DO UPDATE SET
      "endDate" = EXCLUDED."endDate",
      "isActive" = EXCLUDED."isActive",
      "weeklySchedule" = EXCLUDED."weeklySchedule",
      "regularRate" = EXCLUDED."regularRate",
      "overtimeRate" = EXCLUDED."overtimeRate",
      "isExempt" = EXCLUDED."isExempt",
      notes = EXCLUDED.notes,
      "updatedAt" = NOW()
    RETURNING *
  `
  
  const values = [
    schedule.userId,
    schedule.effectiveDate,
    schedule.endDate,
    schedule.isActive,
    JSON.stringify(schedule.weeklySchedule),
    schedule.regularRate,
    schedule.overtimeRate || schedule.regularRate * 1.5,
    schedule.isExempt || false,
    schedule.notes
  ]
  
  const result = await pool.query(query, values)
  return result.rows[0]
}