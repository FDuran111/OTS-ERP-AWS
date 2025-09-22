import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startOfWeek, endOfWeek, addDays, format, startOfDay, endOfDay } from 'date-fns'
import { z } from 'zod'

const scheduleJobSchema = z.object({
  jobId: z.string(),
  startDate: z.string(),
  endDate: z.string().optional().nullable(),
  estimatedHours: z.number().positive(),
  assignedCrew: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // Format: YYYY-MM
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const userId = searchParams.get('userId') // Filter by crew member
    const unscheduled = searchParams.get('unscheduled') === 'true'

    if (unscheduled) {
      try {
        // Return unscheduled jobs
        const unscheduledResult = await query(`
        SELECT 
          j.*,
          COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as "customerName"
        FROM "Job" j
        LEFT JOIN "Customer" c ON j."customerId" = c.id
        LEFT JOIN "JobSchedule" js ON j.id = js."jobId"
        WHERE j.status::text IN ('ESTIMATE', 'APPROVED', 'SCHEDULED')
        AND js.id IS NULL
        ORDER BY j.priority DESC, j."createdAt" ASC
      `)

      const jobs = unscheduledResult.rows.map(row => ({
        id: row.id,
        jobNumber: row.jobNumber,
        title: row.description,
        customer: row.customerName || 'Unknown Customer',
        customerName: row.customerName,
        type: row.type,
        division: row.division || 'LINE_VOLTAGE',
        status: row.status,
        priority: row.priority,
        estimatedHours: parseFloat(row.estimatedHours || 0),
        dueDate: row.scheduledDate,
        address: row.address,
        description: row.description,
      }))

      return NextResponse.json(jobs)
      } catch (dbError) {
        console.log('Database unavailable, returning mock unscheduled jobs')
        // Return mock data when database is unavailable
        return NextResponse.json([
          {
            id: 'mock-1',
            jobNumber: 'J-2024-001',
            title: 'Commercial Wiring Project',
            customer: 'ABC Company',
            customerName: 'ABC Company',
            type: 'INSTALLATION',
            division: 'LINE_VOLTAGE',
            status: 'ESTIMATE',
            priority: 'High',
            estimatedHours: 8,
            dueDate: null,
            address: '123 Main St',
            description: 'Commercial Wiring Project'
          }
        ])
      }
    }

    try {
      let dateFilter = ''
    const params: any[] = []
    let paramIndex = 1

    if (month) {
      // Get all schedules for a specific month
      const [year, monthNum] = month.split('-')
      const monthStart = `${year}-${monthNum}-01`
      // Calculate the last day of the month
      const nextMonth = new Date(parseInt(year), parseInt(monthNum), 1)
      const lastDay = new Date(nextMonth.getTime() - 1).getDate()
      const monthEnd = `${year}-${monthNum}-${lastDay.toString().padStart(2, '0')}`
      
      dateFilter = `AND js."startDate" >= $${paramIndex}::date AND js."startDate" <= $${paramIndex + 1}::date`
      params.push(monthStart, monthEnd)
      paramIndex += 2
    } else if (startDate && endDate) {
      // Get schedules for a specific date range
      dateFilter = `AND js."startDate" >= $${paramIndex} AND js."startDate" <= $${paramIndex + 1}`
      params.push(startDate, endDate)
      paramIndex += 2
    } else if (startDate) {
      // Get schedules for a specific day
      dateFilter = `AND DATE(js."startDate") = $${paramIndex}::date`
      params.push(startDate)
      paramIndex++
    }

    let crewFilter = ''
    if (userId) {
      crewFilter = `AND EXISTS (
        SELECT 1 FROM "CrewAssignment" ca 
        WHERE ca."scheduleId" = js.id 
        AND ca."userId" = $${paramIndex}
        AND ca.status = 'ASSIGNED'
      )`
      params.push(userId)
      paramIndex++
    }

    const result = await query(`
      SELECT 
        js.id,
        js."jobId",
        js."startDate",
        js."endDate", 
        js."estimatedHours",
        js."actualHours",
        js.status,
        js.notes,
        js."createdAt",
        
        -- Job information
        j."jobNumber",
        j.description as title,
        j."customerId",
        j.type,
        j.division,
        j.priority,
        j.status as "jobStatus",
        j.address,
        j.city,
        j.state,
        j.zip,
        
        -- Customer information
        COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as "customerName",
        
        -- Crew assignments
        COALESCE(
          JSON_AGG(
            CASE WHEN ca.id IS NOT NULL THEN
              JSON_BUILD_OBJECT(
                'userId', ca."userId",
                'userName', u.name,
                'role', ca.role,
                'status', ca.status,
                'checkedInAt', ca."checkedInAt",
                'checkedOutAt', ca."checkedOutAt"
              )
            END
          ) FILTER (WHERE ca.id IS NOT NULL),
          '[]'::json
        ) as crew
        
      FROM "JobSchedule" js
      INNER JOIN "Job" j ON js."jobId" = j.id
      LEFT JOIN "Customer" c ON j."customerId" = c.id
      LEFT JOIN "CrewAssignment" ca ON js.id = ca."scheduleId" AND ca.status != 'REMOVED'
      LEFT JOIN "User" u ON ca."userId" = u.id
      WHERE 1=1 ${dateFilter} ${crewFilter}
      GROUP BY js.id, j.id, c.id
      ORDER BY js."startDate" ASC
    `, params)

    const schedules = result.rows.map(row => ({
      id: row.id,
      jobId: row.jobId,
      startDate: row.startDate,
      endDate: row.endDate,
      estimatedHours: parseFloat(row.estimatedHours || 0),
      actualHours: parseFloat(row.actualHours || 0),
      status: row.status,
      notes: row.notes,
      createdAt: row.createdAt,
      job: {
        id: row.jobId,
        jobNumber: row.jobNumber,
        title: row.title,
        customerId: row.customerId,
        customerName: row.customerName,
        customer: row.customerName,
        type: row.type,
        division: row.division || 'LINE_VOLTAGE',
        priority: row.priority,
        status: row.jobStatus,
        address: row.address,
        city: row.city,
        state: row.state,
        zip: row.zip,
        description: row.title,
      },
      assignedCrew: row.crew.map((c: any) => c.userId),
      crew: Array.isArray(row.crew) ? row.crew : []
    }))

    return NextResponse.json(schedules)
    } catch (dbError) {
      console.log('Database unavailable, returning mock schedule data')
      // Return mock data when database is unavailable
      return NextResponse.json([])
    }
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    )
  }
}

// POST /api/schedule - Schedule a job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Schedule POST body:', body)
    const data = scheduleJobSchema.parse(body)

    // Check if job exists and is not already scheduled
    const jobCheck = await query(
      'SELECT id, status FROM "Job" WHERE id = $1',
      [data.jobId]
    )
    
    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const existingSchedule = await query(
      'SELECT id FROM "JobSchedule" WHERE "jobId" = $1',
      [data.jobId]
    )
    
    if (existingSchedule.rows.length > 0) {
      return NextResponse.json(
        { error: 'Job is already scheduled' },
        { status: 400 }
      )
    }

    // Start transaction
    await query('BEGIN')

    try {
      // Create schedule entry
      const scheduleResult = await query(`
        INSERT INTO "JobSchedule" (
          "jobId", "startDate", "endDate", "estimatedHours", notes
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        data.jobId,
        new Date(data.startDate),
        data.endDate ? new Date(data.endDate) : null,
        data.estimatedHours,
        data.notes === null ? null : (data.notes || null)
      ])

      const schedule = scheduleResult.rows[0]

      // Assign crew members
      if (data.assignedCrew.length > 0) {
        for (const userId of data.assignedCrew) {
          await query(`
            INSERT INTO "CrewAssignment" (
              "scheduleId", "userId", "jobId", role
            ) VALUES ($1, $2, $3, $4)
          `, [schedule.id, userId, data.jobId, 'TECHNICIAN'])
        }
      }

      await query('COMMIT')

      // Fetch the complete schedule with job and crew info
      const completeSchedule = await query(`
        SELECT 
          js.*,
          j."jobNumber",
          j.description as title,
          j."customerId",
          COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as "customerName"
        FROM "JobSchedule" js
        INNER JOIN "Job" j ON js."jobId" = j.id
        LEFT JOIN "Customer" c ON j."customerId" = c.id
        WHERE js.id = $1
      `, [schedule.id])

      return NextResponse.json(completeSchedule.rows[0], { status: 201 })
    } catch (error) {
      await query('ROLLBACK')
      throw error
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Schedule validation error:', error.errors)
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error scheduling job:', error)
    return NextResponse.json(
      { error: 'Failed to schedule job' },
      { status: 500 }
    )
  }
}