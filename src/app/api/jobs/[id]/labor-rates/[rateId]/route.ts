import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// Validation schema
const UpdateLaborRateSchema = z.object({
  overriddenRate: z.number().positive('Rate must be positive'),
  notes: z.string().optional(),
})

// PUT /api/jobs/[id]/labor-rates/[rateId] - Update a labor rate override
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; rateId: string } }
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

    const { client } = await connectToDatabase()
    const { id: jobId, rateId } = params
    const body = await request.json()

    // Validate request body
    const validatedData = UpdateLaborRateSchema.parse(body)

    // Verify the rate exists and belongs to the job
    const existingRateResult = await client.query(`
      SELECT id FROM "JobLaborRates" 
      WHERE id = $1 AND job_id = $2
    `, [rateId, jobId])

    if (existingRateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Labor rate override not found' }, { status: 404 })
    }

    // Update the labor rate override
    await client.query(`
      UPDATE "JobLaborRates" 
      SET 
        overridden_rate = $1,
        notes = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND job_id = $4
    `, [
      validatedData.overriddenRate,
      validatedData.notes || null,
      rateId,
      jobId
    ])

    // Get the updated rate with user details
    const rateResult = await client.query(`
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
    `, [rateId])

    return NextResponse.json(rateResult.rows[0])

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating job labor rate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/jobs/[id]/labor-rates/[rateId] - Delete a labor rate override
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; rateId: string } }
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

    const { client } = await connectToDatabase()
    const { id: jobId, rateId } = params

    // Verify the rate exists and belongs to the job
    const existingRateResult = await client.query(`
      SELECT id, user_id FROM "JobLaborRates" 
      WHERE id = $1 AND job_id = $2
    `, [rateId, jobId])

    if (existingRateResult.rows.length === 0) {
      return NextResponse.json({ error: 'Labor rate override not found' }, { status: 404 })
    }

    // Delete the labor rate override
    await client.query(`
      DELETE FROM "JobLaborRates" 
      WHERE id = $1 AND job_id = $2
    `, [rateId, jobId])

    return NextResponse.json({ 
      success: true, 
      message: 'Labor rate override deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting job labor rate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}