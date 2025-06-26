import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// Validation schemas
const CreateLaborRateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  overriddenRate: z.number().positive('Rate must be positive'),
  notes: z.string().optional(),
})


// GET /api/jobs/[id]/labor-rates - Get all labor rate overrides for a job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    if (!userPayload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const resolvedParams = await params
    const jobId = resolvedParams.id

    // Verify job exists and user has access
    const jobResult = await query(
      'SELECT id FROM "Job" WHERE id = $1',
      [jobId]
    )

    if (jobResult.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Get labor rate overrides with user details
    const ratesResult = await query(`
      SELECT 
        jlr.id,
        jlr.user_id,
        jlr.overridden_rate,
        jlr.notes,
        jlr.created_at,
        jlr.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM "JobLaborRates" jlr
      INNER JOIN "User" u ON jlr.user_id = u.id
      WHERE jlr.job_id = $1
      ORDER BY u.name
    `, [jobId])

    return NextResponse.json(ratesResult.rows)

  } catch (error) {
    console.error('Error fetching job labor rates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/jobs/[id]/labor-rates - Create a new labor rate override
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    if (!userPayload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const resolvedParams = await params
    const jobId = resolvedParams.id
    const body = await request.json()

    // Validate request body
    const validatedData = CreateLaborRateSchema.parse(body)

    // Verify job exists
    const jobResult = await query(
      'SELECT id FROM "Job" WHERE id = $1',
      [jobId]
    )

    if (jobResult.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify user exists
    const userResult = await query(
      'SELECT id, name FROM "User" WHERE id = $1',
      [validatedData.userId]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create the labor rate override
    const insertResult = await query(`
      INSERT INTO "JobLaborRates" (
        job_id, 
        user_id, 
        overridden_rate, 
        notes, 
        created_by
      ) 
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      jobId,
      validatedData.userId,
      validatedData.overriddenRate,
      validatedData.notes || null,
      userPayload.id
    ])

    // Get the created rate with user details
    const rateResult = await query(`
      SELECT 
        jlr.id,
        jlr.job_id,
        jlr.user_id,
        jlr.overridden_rate,
        jlr.notes,
        jlr.created_at,
        jlr.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM "JobLaborRates" jlr
      INNER JOIN "User" u ON jlr.user_id = u.id
      WHERE jlr.id = $1
    `, [insertResult.rows[0].id])

    return NextResponse.json(rateResult.rows[0], { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    // Handle unique constraint violation (duplicate user/job combination)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Labor rate override already exists for this user on this job' },
        { status: 409 }
      )
    }

    console.error('Error creating job labor rate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

