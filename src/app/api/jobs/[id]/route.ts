import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

// GET a single job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    // Get job with customer info
    const jobResult = await query(
      `SELECT 
        j.*,
        c.company_name,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.address as customer_address,
        c.city as customer_city,
        c.state as customer_state,
        c.zip as customer_zip
      FROM "Job" j
      INNER JOIN "Customer" c ON j.customer_id = c.id
      WHERE j.id = $1`,
      [resolvedParams.id]
    )

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const job = jobResult.rows[0]

    // Get assignments with user info
    const assignmentsResult = await query(
      `SELECT 
        ja.*,
        u.name,
        u.email,
        u.role
      FROM "JobAssignment" ja
      INNER JOIN "User" u ON ja.user_id = u.id
      WHERE ja.job_id = $1`,
      [resolvedParams.id]
    )

    // Get time entries with user info
    const timeEntriesResult = await query(
      `SELECT 
        te.*,
        u.name as user_name
      FROM "TimeEntry" te
      INNER JOIN "User" u ON te.user_id = u.id
      WHERE te.job_id = $1
      ORDER BY te.date DESC`,
      [resolvedParams.id]
    )

    // Get material usage with material info
    const materialUsageResult = await query(
      `SELECT 
        mu.*,
        m.code,
        m.name,
        m.unit,
        m.cost,
        m.price
      FROM "MaterialUsage" mu
      INNER JOIN "Material" m ON mu.material_id = m.id
      WHERE mu.job_id = $1`,
      [resolvedParams.id]
    )

    // Get job phases
    const phasesResult = await query(
      `SELECT * FROM "JobPhase" WHERE job_id = $1 ORDER BY created_at`,
      [resolvedParams.id]
    )

    // Get change orders
    const changeOrdersResult = await query(
      `SELECT * FROM "ChangeOrder" WHERE job_id = $1 ORDER BY created_at DESC`,
      [resolvedParams.id]
    )

    // Get job notes
    const notesResult = await query(
      `SELECT * FROM "JobNote" WHERE job_id = $1 ORDER BY created_at DESC`,
      [resolvedParams.id]
    )

    // Build the complete job object
    const completeJob = {
      id: job.id,
      jobNumber: job.job_number,
      description: job.description,
      status: job.status,
      type: job.type,
      address: job.address,
      city: job.city,
      state: job.state,
      zip: job.zip,
      scheduledDate: job.scheduled_date,
      completedDate: job.completed_date,
      estimatedHours: parseFloat(job.estimated_hours) || 0,
      estimatedCost: parseFloat(job.estimated_cost) || 0,
      actualHours: parseFloat(job.actual_hours) || 0,
      actualCost: parseFloat(job.actual_cost) || 0,
      billedAmount: parseFloat(job.billed_amount) || 0,
      billedDate: job.billed_date,
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      customer: {
        id: job.customer_id,
        companyName: job.company_name,
        firstName: job.first_name,
        lastName: job.last_name,
        email: job.email,
        phone: job.phone,
        address: job.customer_address,
        city: job.customer_city,
        state: job.customer_state,
        zip: job.customer_zip
      },
      assignments: assignmentsResult.rows.map(assignment => ({
        id: assignment.id,
        userId: assignment.user_id,
        assignedBy: assignment.assigned_by,
        assignedAt: assignment.assigned_at,
        user: {
          id: assignment.user_id,
          name: assignment.name,
          email: assignment.email,
          role: assignment.role
        }
      })),
      timeEntries: timeEntriesResult.rows.map(entry => ({
        id: entry.id,
        date: entry.date,
        hours: parseFloat(entry.hours),
        description: entry.description,
        user: {
          name: entry.user_name
        }
      })),
      materialUsage: materialUsageResult.rows.map(usage => ({
        id: usage.id,
        quantity: parseFloat(usage.quantity),
        costAtTime: parseFloat(usage.cost_at_time),
        usedAt: usage.used_at,
        material: {
          id: usage.material_id,
          code: usage.code,
          name: usage.name,
          unit: usage.unit,
          cost: parseFloat(usage.cost),
          price: parseFloat(usage.price)
        }
      })),
      phases: phasesResult.rows,
      changeOrders: changeOrdersResult.rows,
      notes: notesResult.rows
    }

    return NextResponse.json(completeJob)
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}

// Schema for updating a job
const updateJobSchema = z.object({
  description: z.string().optional(),
  status: z.enum(['ESTIMATE', 'SCHEDULED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'BILLED', 'CANCELLED']).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  estimatedCost: z.number().optional(),
  actualHours: z.number().optional(),
  actualCost: z.number().optional(),
  billedAmount: z.number().optional(),
  assignedUserIds: z.array(z.string()).optional(),
})

// PATCH update a job
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = updateJobSchema.parse(body)

    // If assignedUserIds is provided, update assignments
    if (data.assignedUserIds) {
      // Remove existing assignments
      await query(
        'DELETE FROM "JobAssignment" WHERE job_id = $1',
        [resolvedParams.id]
      )

      // Create new assignments
      for (const userId of data.assignedUserIds) {
        await query(
          `INSERT INTO "JobAssignment" (
            id, job_id, user_id, assigned_by, assigned_at, created_at, updated_at
          ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
          [
            resolvedParams.id,
            userId,
            'system', // TODO: Get from authenticated user
            new Date(),
            new Date(),
            new Date()
          ]
        )
      }
    }

    // Build update fields
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (data.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`)
      updateValues.push(data.description)
    }
    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`)
      updateValues.push(data.status)
    }
    if (data.address !== undefined) {
      updateFields.push(`address = $${paramIndex++}`)
      updateValues.push(data.address)
    }
    if (data.city !== undefined) {
      updateFields.push(`city = $${paramIndex++}`)
      updateValues.push(data.city)
    }
    if (data.state !== undefined) {
      updateFields.push(`state = $${paramIndex++}`)
      updateValues.push(data.state)
    }
    if (data.zip !== undefined) {
      updateFields.push(`zip = $${paramIndex++}`)
      updateValues.push(data.zip)
    }
    if (data.scheduledDate !== undefined) {
      updateFields.push(`scheduled_date = $${paramIndex++}`)
      updateValues.push(data.scheduledDate ? new Date(data.scheduledDate) : null)
    }
    if (data.completedDate !== undefined) {
      updateFields.push(`completed_date = $${paramIndex++}`)
      updateValues.push(data.completedDate ? new Date(data.completedDate) : null)
    }
    if (data.estimatedHours !== undefined) {
      updateFields.push(`estimated_hours = $${paramIndex++}`)
      updateValues.push(data.estimatedHours)
    }
    if (data.estimatedCost !== undefined) {
      updateFields.push(`estimated_cost = $${paramIndex++}`)
      updateValues.push(data.estimatedCost)
    }
    if (data.actualHours !== undefined) {
      updateFields.push(`actual_hours = $${paramIndex++}`)
      updateValues.push(data.actualHours)
    }
    if (data.actualCost !== undefined) {
      updateFields.push(`actual_cost = $${paramIndex++}`)
      updateValues.push(data.actualCost)
    }
    if (data.billedAmount !== undefined) {
      updateFields.push(`billed_amount = $${paramIndex++}`)
      updateValues.push(data.billedAmount)
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = $${paramIndex++}`)
      updateValues.push(new Date())
      updateValues.push(resolvedParams.id)

      await query(
        `UPDATE "Job" SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      )
    }

    // Get the updated job with customer and assignments
    const updatedJobResult = await query(
      `SELECT 
        j.*,
        c.company_name,
        c.first_name,
        c.last_name
      FROM "Job" j
      INNER JOIN "Customer" c ON j.customer_id = c.id
      WHERE j.id = $1`,
      [resolvedParams.id]
    )

    return NextResponse.json(updatedJobResult.rows[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating job:', error)
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}

// DELETE a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    // Delete related records first
    await Promise.all([
      query('DELETE FROM "JobAssignment" WHERE job_id = $1', [resolvedParams.id]),
      query('DELETE FROM "JobPhase" WHERE job_id = $1', [resolvedParams.id]),
      query('DELETE FROM "TimeEntry" WHERE job_id = $1', [resolvedParams.id]),
      query('DELETE FROM "MaterialUsage" WHERE job_id = $1', [resolvedParams.id]),
      query('DELETE FROM "ChangeOrder" WHERE job_id = $1', [resolvedParams.id]),
      query('DELETE FROM "JobNote" WHERE job_id = $1', [resolvedParams.id])
    ])

    // Finally delete the job
    await query('DELETE FROM "Job" WHERE id = $1', [resolvedParams.id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { error: 'Failed to delete job', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}