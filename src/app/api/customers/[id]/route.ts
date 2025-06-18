import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

// GET a single customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    // Get customer with their jobs
    const customerResult = await query(
      'SELECT * FROM "Customer" WHERE id = $1',
      [resolvedParams.id]
    )

    if (customerResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    const customer = customerResult.rows[0]

    // Get customer's jobs
    const jobsResult = await query(
      `SELECT id, "jobNumber", description, status, "createdAt"
       FROM "Job" 
       WHERE "customerId" = $1 
       ORDER BY "createdAt" DESC`,
      [resolvedParams.id]
    )

    const customerWithJobs = {
      ...customer,
      jobs: jobsResult.rows.map(job => ({
        id: job.id,
        jobNumber: job.jobNumber,
        description: job.description,
        status: job.status,
        createdAt: job.createdAt
      }))
    }

    return NextResponse.json(customerWithJobs)
  } catch (error) {
    console.error('Error fetching customer:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer' },
      { status: 500 }
    )
  }
}

// Schema for updating a customer
const updateCustomerSchema = z.object({
  companyName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
})

// PATCH update a customer
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = updateCustomerSchema.parse(body)

    // Build update fields
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (data.companyName !== undefined) {
      updateFields.push(`"companyName" = $${paramIndex++}`)
      updateValues.push(data.companyName)
    }
    if (data.firstName !== undefined) {
      updateFields.push(`"firstName" = $${paramIndex++}`)
      updateValues.push(data.firstName)
    }
    if (data.lastName !== undefined) {
      updateFields.push(`"lastName" = $${paramIndex++}`)
      updateValues.push(data.lastName)
    }
    if (data.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`)
      updateValues.push(data.email || null)
    }
    if (data.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`)
      updateValues.push(data.phone)
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

    if (updateFields.length > 0) {
      updateFields.push(`"updatedAt" = $${paramIndex++}`)
      updateValues.push(new Date())
      updateValues.push(resolvedParams.id)

      await query(
        `UPDATE "Customer" SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
        updateValues
      )
    }

    // Get updated customer
    const updatedCustomerResult = await query(
      'SELECT * FROM "Customer" WHERE id = $1',
      [resolvedParams.id]
    )

    return NextResponse.json(updatedCustomerResult.rows[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// DELETE a customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    // Check if customer has any jobs
    const jobCountResult = await query(
      'SELECT COUNT(*) as count FROM "Job" WHERE "customerId" = $1',
      [resolvedParams.id]
    )

    const jobCount = parseInt(jobCountResult.rows[0].count)

    if (jobCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with existing jobs' },
        { status: 400 }
      )
    }

    await query('DELETE FROM "Customer" WHERE id = $1', [resolvedParams.id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}