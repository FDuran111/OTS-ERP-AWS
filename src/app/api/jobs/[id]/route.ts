import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { permissions, stripPricingData } from '@/lib/permissions'
import { verifyToken } from '@/lib/auth'
import { generateJobCompletionJournalEntry } from '@/lib/workflows/job-completion-automation'

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
        c."companyName",
        c."firstName",
        c."lastName",
        c.email,
        c.phone,
        c.address as customer_address,
        c.city as customer_city,
        c.state as customer_state,
        c.zip as customer_zip
      FROM "Job" j
      INNER JOIN "Customer" c ON j."customerId" = c.id
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
      INNER JOIN "User" u ON ja."userId" = u.id
      WHERE ja."jobId" = $1`,
      [resolvedParams.id]
    )

    // Get time entries with user info and pay rates
    const timeEntriesResult = await query(
      `SELECT
        te.*,
        u.name as user_name,
        u."regularRate",
        u."overtimeRate",
        u."doubleTimeRate"
      FROM "TimeEntry" te
      INNER JOIN "User" u ON te."userId" = u.id
      WHERE te."jobId" = $1
      ORDER BY te.date DESC`,
      [resolvedParams.id]
    )

    // Calculate actual hours and cost from time entries
    const actualHoursFromEntries = timeEntriesResult.rows.reduce((sum, entry) => {
      return sum + (parseFloat(entry.hours) || 0)
    }, 0)

    // Calculate actual labor cost based on time entry breakdown
    const actualLaborCost = timeEntriesResult.rows.reduce((sum, entry) => {
      const regularHours = parseFloat(entry.regularHours) || 0
      const overtimeHours = parseFloat(entry.overtimeHours) || 0
      const doubleTimeHours = parseFloat(entry.doubleTimeHours) || 0
      const regularRate = parseFloat(entry.regularRate) || 15
      const overtimeRate = parseFloat(entry.overtimeRate) || (regularRate * 1.5)
      const doubleTimeRate = parseFloat(entry.doubleTimeRate) || (regularRate * 2)

      const entryCost = (regularHours * regularRate) +
                       (overtimeHours * overtimeRate) +
                       (doubleTimeHours * doubleTimeRate)
      return sum + entryCost
    }, 0)

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
      INNER JOIN "Material" m ON mu."materialId" = m.id
      WHERE mu."jobId" = $1`,
      [resolvedParams.id]
    )

    // Get job phases
    const phasesResult = await query(
      `SELECT * FROM "JobPhase" WHERE "jobId" = $1 ORDER BY "createdAt"`,
      [resolvedParams.id]
    )

    // Get change orders
    const changeOrdersResult = await query(
      `SELECT * FROM "ChangeOrder" WHERE "jobId" = $1 ORDER BY "createdAt" DESC`,
      [resolvedParams.id]
    )

    // Get job notes
    const notesResult = await query(
      `SELECT * FROM "JobNote" WHERE "jobId" = $1 ORDER BY "createdAt" DESC`,
      [resolvedParams.id]
    )

    // Build the complete job object
    const completeJob = {
      id: job.id,
      jobNumber: job.jobNumber,
      customerPO: job.customerPO,
      title: job.description,  // Map description to title for frontend
      description: job.description,
      status: job.status,
      type: job.type,
      division: job.division || 'LINE_VOLTAGE',
      priority: job.estimatedHours && parseFloat(job.estimatedHours) > 40 ? 'High' : 'Medium',  // Calculate priority
      customerId: job.customerId,
      customerName: job.companyName || `${job.firstName} ${job.lastName}`,
      address: job.address,
      city: job.city,
      state: job.state,
      zip: job.zip,
      dueDate: job.scheduledDate,  // Map scheduledDate to dueDate for frontend consistency
      scheduledDate: job.scheduledDate,
      completedDate: job.completedDate,
      estimatedHours: parseFloat(job.estimatedHours) || 0,
      estimatedCost: parseFloat(job.estimatedCost) || 0,
      actualHours: actualHoursFromEntries, // Use calculated hours from time entries
      actualCost: actualLaborCost, // Use calculated cost from time entries
      billedAmount: parseFloat(job.billedAmount) || 0,
      billedDate: job.billedDate,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      customer: {
        id: job.customerId,
        companyName: job.companyName,
        firstName: job.firstName,
        lastName: job.lastName,
        email: job.email,
        phone: job.phone,
        address: job.customer_address,
        city: job.customer_city,
        state: job.customer_state,
        zip: job.customer_zip
      },
      crew: assignmentsResult.rows.map(a => a.name),  // Add crew names for compatibility
      assignments: assignmentsResult.rows.map(assignment => ({
        id: assignment.id,
        userId: assignment.userId,
        assignedBy: assignment.assignedBy,
        assignedAt: assignment.assignedAt,
        user: {
          id: assignment.userId,
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
        costAtTime: parseFloat(usage.costAtTime),
        usedAt: usage.usedAt,
        material: {
          id: usage.materialId,
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

    // Get user role to determine pricing visibility
    const token = request.cookies.get('auth-token')?.value
    if (token) {
      try {
        const userPayload = verifyToken(token)
        const userRole = userPayload.role
        
        // Strip pricing data if user is EMPLOYEE
        if (!permissions.canViewJobCosts(userRole)) {
          const pricingFields = ['estimatedCost', 'actualCost', 'billedAmount']
          const strippedJob = stripPricingData(completeJob, userRole, pricingFields)
          
          // Also strip material costs
          if (strippedJob.materialUsage && !permissions.canViewMaterialCosts(userRole)) {
            strippedJob.materialUsage = strippedJob.materialUsage.map((usage: any) => {
              const { costAtTime, material, ...rest } = usage
              return {
                ...rest,
                material: {
                  ...material,
                  cost: undefined,
                  price: undefined
                }
              }
            })
          }
          
          return NextResponse.json(strippedJob)
        }
      } catch (error) {
        console.error('Error verifying token:', error)
      }
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
  customerId: z.string().optional(),
  type: z.enum(['SERVICE_CALL', 'INSTALLATION']).optional(),
  division: z.enum(['LOW_VOLTAGE', 'LINE_VOLTAGE']).optional(),
  description: z.string().optional(),
  customerPO: z.string().optional(),
  status: z.enum(['ESTIMATE', 'PENDING_APPROVAL', 'SCHEDULED', 'DISPATCHED', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'BILLED', 'CANCELLED']).optional(),
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
    console.log('PATCH request body:', body)
    const data = updateJobSchema.parse(body)

    // If assignedUserIds is provided, update assignments
    if (data.assignedUserIds) {
      // Remove existing assignments
      await query(
        'DELETE FROM "JobAssignment" WHERE "jobId" = $1',
        [resolvedParams.id]
      )

      // Create new assignments
      for (const userId of data.assignedUserIds) {
        await query(
          `INSERT INTO "JobAssignment" (
            id, "jobId", "userId", "assignedBy", "assignedAt"
          ) VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
          [
            resolvedParams.id,
            userId,
            'system', // TODO: Get from authenticated user
            new Date()
          ]
        )
      }
    }

    // Build update fields
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (data.customerId !== undefined) {
      updateFields.push(`"customerId" = $${paramIndex++}`)
      updateValues.push(data.customerId)
    }
    if (data.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`)
      updateValues.push(data.type)
    }
    if (data.division !== undefined) {
      updateFields.push(`division = $${paramIndex++}`)
      updateValues.push(data.division)
    }
    if (data.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`)
      updateValues.push(data.description)
    }
    if (data.customerPO !== undefined) {
      updateFields.push(`"customerPO" = $${paramIndex++}`)
      updateValues.push(data.customerPO)
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
      updateFields.push(`"scheduledDate" = $${paramIndex++}`)
      updateValues.push(data.scheduledDate ? new Date(data.scheduledDate) : null)
    }
    if (data.completedDate !== undefined) {
      updateFields.push(`"completedDate" = $${paramIndex++}`)
      updateValues.push(data.completedDate ? new Date(data.completedDate) : null)
    }
    if (data.estimatedHours !== undefined) {
      updateFields.push(`"estimatedHours" = $${paramIndex++}`)
      updateValues.push(data.estimatedHours)
    }
    if (data.estimatedCost !== undefined) {
      updateFields.push(`"estimatedCost" = $${paramIndex++}`)
      updateValues.push(data.estimatedCost)
    }
    if (data.actualHours !== undefined) {
      updateFields.push(`"actualHours" = $${paramIndex++}`)
      updateValues.push(data.actualHours)
    }
    if (data.actualCost !== undefined) {
      updateFields.push(`"actualCost" = $${paramIndex++}`)
      updateValues.push(data.actualCost)
    }
    if (data.billedAmount !== undefined) {
      updateFields.push(`"billedAmount" = $${paramIndex++}`)
      updateValues.push(data.billedAmount)
    }

    if (updateFields.length > 0) {
      updateFields.push(`"updatedAt" = $${paramIndex++}`)
      updateValues.push(new Date())
      updateValues.push(resolvedParams.id)

      await query(
        `UPDATE "Job" SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      )
    }

    // If status changed to COMPLETED, trigger accounting automation
    if (data.status === 'COMPLETED') {
      try {
        // Set completedDate if not already set
        await query(
          `UPDATE "Job" SET "completedDate" = COALESCE("completedDate", CURRENT_TIMESTAMP) WHERE id = $1`,
          [resolvedParams.id]
        )

        // Generate COGS journal entry
        const journalEntryId = await generateJobCompletionJournalEntry(resolvedParams.id)
        console.log(`Created COGS journal entry ${journalEntryId} for job ${resolvedParams.id}`)
      } catch (accountingError) {
        // Log error but don't fail the job update - accounting can be retried
        console.error('Failed to create COGS journal entry:', accountingError)
        // Optionally: Create a notification for admins about the failed accounting entry
      }
    }

    // Get the updated job with customer and assignments
    const updatedJobResult = await query(
      `SELECT 
        j.*,
        c."companyName",
        c."firstName",
        c."lastName"
      FROM "Job" j
      INNER JOIN "Customer" c ON j."customerId" = c.id
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
      { error: 'Failed to update job', details: error instanceof Error ? error.message : 'Unknown error' },
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
    // Check if job exists first
    const jobCheck = await query(
      'SELECT id, "jobNumber", status FROM "Job" WHERE id = $1',
      [resolvedParams.id]
    )

    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const job = jobCheck.rows[0]

    // Check for related invoices
    const invoiceCheck = await query(
      'SELECT COUNT(*) as count FROM "Invoice" WHERE "jobId" = $1',
      [resolvedParams.id]
    )
    
    if (invoiceCheck.rows[0].count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete this job to preserve financial integrity. This job has associated invoices and must be retained for accounting purposes.' },
        { status: 400 }
      )
    }

    // Check for related schedules
    const scheduleCheck = await query(
      'SELECT COUNT(*) as count FROM "JobSchedule" WHERE "jobId" = $1',
      [resolvedParams.id]
    )
    
    if (scheduleCheck.rows[0].count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete job with existing schedules. Please remove all schedules first.' },
        { status: 400 }
      )
    }

    // Optional: Prevent deletion of completed/billed jobs
    if (job.status === 'BILLED') {
      return NextResponse.json(
        { error: 'Cannot delete billed jobs. Please contact an administrator.' },
        { status: 400 }
      )
    }

    // Delete related records first (in proper order to handle foreign key constraints)
    await Promise.all([
      query('DELETE FROM "JobAssignment" WHERE "jobId" = $1', [resolvedParams.id]),
      query('DELETE FROM "JobPhase" WHERE "jobId" = $1', [resolvedParams.id]),
      query('DELETE FROM "TimeEntry" WHERE "jobId" = $1', [resolvedParams.id]),
      query('DELETE FROM "MaterialUsage" WHERE "jobId" = $1', [resolvedParams.id]),
      query('DELETE FROM "ChangeOrder" WHERE "jobId" = $1', [resolvedParams.id]),
      query('DELETE FROM "JobNote" WHERE "jobId" = $1', [resolvedParams.id]),
      query('DELETE FROM "JobSchedule" WHERE "jobId" = $1', [resolvedParams.id])
    ])

    // Finally delete the job
    const deleteResult = await query('DELETE FROM "Job" WHERE id = $1', [resolvedParams.id])

    if (deleteResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Job could not be deleted' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: `Job ${job.jobNumber} has been successfully deleted`
    })
  } catch (error) {
    console.error('Error deleting job:', error)
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('foreign key constraint')) {
        return NextResponse.json(
          { error: 'Cannot delete job due to related records. Please contact support.' },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to delete job', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}