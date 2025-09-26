import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { withRBAC } from '@/lib/rbac-middleware'
import { permissions, stripPricingFromArray } from '@/lib/permissions'
import { verifyToken } from '@/lib/auth'

// GET all jobs
export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
})(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const unscheduled = searchParams.get('unscheduled') === 'true'

    let whereClause = ''
    let joinClause = ''
    const params: any[] = []
    let paramIndex = 1

    // Get user info from token to check if they're an employee
    const token = request.cookies.get('auth-token')?.value
    let userId: string | null = null
    let userRole: string | null = null

    if (token) {
      try {
        const userPayload = verifyToken(token)
        userRole = userPayload.role
        userId = (userPayload as any).userId || userPayload.id
      } catch (error) {
        console.error('Error verifying token:', error)
      }
    }

    // If user is an EMPLOYEE, filter to only show their assigned jobs
    if (userRole === 'EMPLOYEE' && userId) {
      // Add joins to check both JobAssignment and CrewAssignment
      joinClause = `
        LEFT JOIN "JobSchedule" js2 ON j.id = js2."jobId"
        LEFT JOIN "CrewAssignment" ca ON js2.id = ca."scheduleId"
      `

      // Filter to only jobs where the employee is assigned
      whereClause = `WHERE (
        EXISTS (SELECT 1 FROM "JobAssignment" ja WHERE ja."jobId" = j.id AND ja."userId" = $${paramIndex})
        OR ca."userId" = $${paramIndex}
      )`
      params.push(userId)
      paramIndex++
    }

    if (statusFilter) {
      const statuses = statusFilter.split(',').map(s => s.trim().toUpperCase())
      const statusPlaceholders = statuses.map(() => `$${paramIndex++}`).join(', ')
      if (whereClause) {
        whereClause += ` AND j.status::text IN (${statusPlaceholders})`
      } else {
        whereClause = `WHERE j.status::text IN (${statusPlaceholders})`
      }
      params.push(...statuses)
    }

    if (unscheduled) {
      if (!joinClause.includes('JobSchedule')) {
        joinClause += ' LEFT JOIN "JobSchedule" js ON j.id = js."jobId"'
      }
      if (whereClause) {
        whereClause += ' AND js.id IS NULL'
      } else {
        whereClause = 'WHERE js.id IS NULL'
      }
    }

    // Get jobs with customer info and aggregated data
    const jobsResult = await query(`
      SELECT DISTINCT
        j.*,
        c."companyName",
        c."firstName",
        c."lastName",
        COALESCE(SUM(DISTINCT te.hours), 0) as total_hours,
        COUNT(DISTINCT ja."userId") as crew_count,
        array_agg(DISTINCT u.name) FILTER (WHERE u.name IS NOT NULL) as crew_names
      FROM "Job" j
      INNER JOIN "Customer" c ON j."customerId" = c.id
      LEFT JOIN "TimeEntry" te ON j.id = te."jobId"
      LEFT JOIN "JobAssignment" ja ON j.id = ja."jobId"
      LEFT JOIN "User" u ON ja."userId" = u.id
      ${joinClause}
      ${whereClause}
      GROUP BY j.id, c.id
      ORDER BY j."createdAt" DESC
    `, params)


    // Transform the data to match the frontend format
    const transformedJobs = jobsResult.rows.map(job => ({
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.description,
      customer: job.companyName || `${job.firstName} ${job.lastName}`,
      customerId: job.customerId,
      status: job.status.toLowerCase(),
      type: job.type,
      division: job.division || 'LINE_VOLTAGE',
      priority: job.estimatedHours && parseFloat(job.estimatedHours) > 40 ? 'high' : 'medium',
      dueDate: job.scheduledDate || null,
      completedDate: job.completedDate || null,
      crew: job.crew_names || [],
      estimatedHours: parseFloat(job.estimatedHours) || 0,
      actualHours: parseFloat(job.total_hours) || 0,
      estimatedCost: parseFloat(job.estimatedCost) || 0,
      actualCost: parseFloat(job.actualCost) || 0,
      address: job.address,
      city: job.city,
      state: job.state,
      zip: job.zip
    }))

    // Get user role to determine pricing visibility (use already retrieved userRole)
    if (userRole) {
      // Strip pricing data if user is EMPLOYEE
      if (!permissions.canViewJobCosts(userRole)) {
        const pricingFields = ['estimatedCost', 'actualCost']
        return NextResponse.json(stripPricingFromArray(transformedJobs, userRole, pricingFields))
      }
    }

    return NextResponse.json(transformedJobs)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
})

// Schema for creating a job
const createJobSchema = z.object({
  customerId: z.string(),
  type: z.enum(['SERVICE_CALL', 'INSTALLATION']),
  division: z.enum(['LOW_VOLTAGE', 'LINE_VOLTAGE']).optional().default('LINE_VOLTAGE'),
  category: z.string().optional(),
  description: z.string(),
  customerPO: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  scheduledDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  estimatedCost: z.number().optional(),
  assignedUserIds: z.array(z.string()).optional(),
  status: z.enum(['ESTIMATE', 'SCHEDULED']).optional(),
})

// POST create a new job
export const POST = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
})(async (request: NextRequest) => {
  let body: any
  try {
    body = await request.json()
    const data = createJobSchema.parse(body)

    // Get the authenticated user from the request
    const user = (request as any).user

    // Get the current year for job numbering
    const year = new Date().getFullYear().toString().slice(-2)
    
    // Find the last job number for this year
    const lastJobResult = await query(
      `SELECT "jobNumber" FROM "Job" 
       WHERE "jobNumber" LIKE $1 
       ORDER BY "jobNumber" DESC 
       LIMIT 1`,
      [`${year}-%`]
    )

    // Generate new job number
    let sequence = 1
    if (lastJobResult.rows.length > 0) {
      const lastSequence = parseInt(lastJobResult.rows[0].jobNumber.split('-')[1])
      sequence = lastSequence + 1
    }
    
    const jobNumber = `${year}-${sequence.toString().padStart(3, '0')}-001`

    // Create the job
    const jobResult = await query(
      `INSERT INTO "Job" (
        id, "jobNumber", "customerId", type, division, category, description, status,
        address, city, state, zip, "scheduledDate",
        "estimatedHours", "estimatedCost", "createdAt", "updatedAt"
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        jobNumber,
        data.customerId,
        data.type,
        data.division || 'LINE_VOLTAGE',
        data.category || null,
        data.description,
        data.status || 'ESTIMATE',
        data.address || null,
        data.city || null,
        data.state || null,
        data.zip || null,
        data.scheduledDate ? new Date(data.scheduledDate) : null,
        data.estimatedHours || null,
        data.estimatedCost || null,
        new Date(),
        new Date()
      ]
    )

    const job = jobResult.rows[0]

    // Auto-assign the creating employee to the job if they are an employee
    if (user.role === 'EMPLOYEE') {
      await query(
        `INSERT INTO "JobAssignment" (
          id, "jobId", "userId", "assignedBy", "assignedAt"
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
        [
          job.id,
          user.id,
          user.id, // Self-assigned
          new Date()
        ]
      )
    }

    // Create assignments if provided (for additional users)
    if (data.assignedUserIds && data.assignedUserIds.length > 0) {
      for (const userId of data.assignedUserIds) {
        // Skip if this is the creating employee (already assigned above)
        if (user.role === 'EMPLOYEE' && userId === user.id) continue;

        await query(
          `INSERT INTO "JobAssignment" (
            id, "jobId", "userId", "assignedBy", "assignedAt"
          ) VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
          [
            job.id,
            userId,
            user.id || 'system',
            new Date()
          ]
        )
      }
    }

    // If scheduledDate is provided, create a JobSchedule entry
    if (data.scheduledDate) {
      const scheduleResult = await query(
        `INSERT INTO "JobSchedule" (
          id, "jobId", "startDate", "endDate", "estimatedHours",
          status, "createdAt", "updatedAt"
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          job.id,
          new Date(data.scheduledDate),
          new Date(data.scheduledDate), // Same as start date for now
          data.estimatedHours || 8, // Default to 8 hours if not specified
          'SCHEDULED',
          new Date(),
          new Date()
        ]
      )

      const scheduleId = scheduleResult.rows[0].id

      // Auto-assign the creating employee to the crew if they are an employee
      if (user.role === 'EMPLOYEE') {
        await query(
          `INSERT INTO "CrewAssignment" (
            id, "scheduleId", "userId", "jobId", role, status, "createdAt", "updatedAt"
          ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
          [
            scheduleId,
            user.id,
            job.id,
            'TECHNICIAN',
            'ASSIGNED',
            new Date(),
            new Date()
          ]
        )
      }

      // If assignedUserIds provided, create crew assignments for the schedule
      if (data.assignedUserIds && data.assignedUserIds.length > 0) {
        for (const userId of data.assignedUserIds) {
          // Skip if this is the creating employee (already assigned above)
          if (user.role === 'EMPLOYEE' && userId === user.id) continue;

          await query(
            `INSERT INTO "CrewAssignment" (
              id, "scheduleId", "userId", "jobId", role, status, "assignedAt", "assignedBy"
            ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
            [
              scheduleId,
              userId,
              job.id,
              'TECHNICIAN',
              'ASSIGNED',
              new Date(),
              user.id || 'system'
            ]
          )
        }
      }
    }

    // Get the complete job with customer info
    const completeJobResult = await query(
      `SELECT 
        j.*,
        c."companyName",
        c."firstName",
        c."lastName"
      FROM "Job" j
      INNER JOIN "Customer" c ON j."customerId" = c.id
      WHERE j.id = $1`,
      [job.id]
    )

    return NextResponse.json(completeJobResult.rows[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.errors)
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating job:', error)
    console.error('Request body was:', body)
    return NextResponse.json(
      { error: 'Failed to create job', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
})