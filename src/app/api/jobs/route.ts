import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

// GET all jobs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const unscheduled = searchParams.get('unscheduled') === 'true'

    let whereClause = ''
    let joinClause = ''
    const params: any[] = []
    let paramIndex = 1

    if (statusFilter) {
      const statuses = statusFilter.split(',').map(s => s.trim().toUpperCase())
      const statusPlaceholders = statuses.map(() => `$${paramIndex++}`).join(', ')
      whereClause += `WHERE j.status::text IN (${statusPlaceholders})`
      params.push(...statuses)
    }

    if (unscheduled) {
      joinClause = 'LEFT JOIN "JobSchedule" js ON j.id = js."jobId"'
      if (whereClause) {
        whereClause += ' AND js.id IS NULL'
      } else {
        whereClause = 'WHERE js.id IS NULL'
      }
    }

    // Get jobs with customer info and aggregated data
    const jobsResult = await query(`
      SELECT 
        j.*,
        c."companyName",
        c."firstName",
        c."lastName",
        COALESCE(SUM(te.hours), 0) as total_hours,
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

    // Get job phases separately for simplicity
    const phasesResult = await query(`
      SELECT 
        jp."jobId",
        jp.id,
        jp.name,
        jp.status
      FROM "JobPhase" jp
    `)

    // Group phases by job
    const phasesByJob = phasesResult.rows.reduce((acc, phase) => {
      if (!acc[phase.jobId]) {
        acc[phase.jobId] = []
      }
      acc[phase.jobId].push({
        id: phase.id,
        name: phase.name,
        status: phase.status
      })
      return acc
    }, {} as Record<string, any[]>)

    // Transform the data to match the frontend format
    const transformedJobs = jobsResult.rows.map(job => ({
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.description,
      customer: job.companyName || `${job.firstName} ${job.lastName}`,
      customerId: job.customerId,
      status: job.status.toLowerCase(),
      type: job.type,
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
      zip: job.zip,
      jobPhases: phasesByJob[job.id] || [],
      phases: [] // Legacy field
    }))

    return NextResponse.json(transformedJobs)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

// Schema for creating a job
const createJobSchema = z.object({
  customerId: z.string(),
  type: z.enum(['SERVICE_CALL', 'COMMERCIAL_PROJECT']),
  description: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  scheduledDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  estimatedCost: z.number().optional(),
  assignedUserIds: z.array(z.string()).optional(),
})

// POST create a new job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createJobSchema.parse(body)

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
        id, "jobNumber", "customerId", type, description, status,
        address, city, state, zip, "scheduledDate",
        "estimatedHours", "estimatedCost", "createdAt", "updatedAt"
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        jobNumber,
        data.customerId,
        data.type,
        data.description,
        'ESTIMATE',
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

    // Create assignments if provided
    if (data.assignedUserIds && data.assignedUserIds.length > 0) {
      for (const userId of data.assignedUserIds) {
        await query(
          `INSERT INTO "JobAssignment" (
            id, "jobId", "userId", "assignedBy", "assignedAt"
          ) VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
          [
            job.id,
            userId,
            'system', // TODO: Get from authenticated user
            new Date()
          ]
        )
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
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating job:', error)
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    )
  }
}