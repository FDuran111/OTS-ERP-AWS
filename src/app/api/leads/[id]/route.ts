import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const updateLeadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.string().optional(),
  estimatedValue: z.number().optional(),
  priority: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
})

// GET single lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const result = await query(
      'SELECT * FROM "Lead" WHERE id = $1',
      [resolvedParams.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 }
    )
  }
}

// PATCH update lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    console.log('Updating lead with data:', body)
    const data = updateLeadSchema.parse(body)

    // Build update fields dynamically
    const updateFields = []
    const updateValues = []
    let paramIndex = 1

    if (data.firstName !== undefined) {
      updateFields.push(`"firstName" = $${paramIndex++}`)
      updateValues.push(data.firstName)
    }
    if (data.lastName !== undefined) {
      updateFields.push(`"lastName" = $${paramIndex++}`)
      updateValues.push(data.lastName)
    }
    if (data.companyName !== undefined) {
      updateFields.push(`"companyName" = $${paramIndex++}`)
      updateValues.push(data.companyName || null)
    }
    if (data.email !== undefined) {
      updateFields.push(`email = $${paramIndex++}`)
      updateValues.push(data.email || null)
    }
    if (data.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`)
      updateValues.push(data.phone || null)
    }
    if (data.source !== undefined) {
      updateFields.push(`source = $${paramIndex++}`)
      updateValues.push(data.source || null)
    }
    if (data.estimatedValue !== undefined) {
      updateFields.push(`"estimatedValue" = $${paramIndex++}`)
      updateValues.push(data.estimatedValue || null)
    }
    if (data.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex++}`)
      updateValues.push(data.priority || null)
    }
    if (data.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`)
      updateValues.push(data.description || null)
    }
    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`)
      updateValues.push(data.status)
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Always update the updatedAt field
    updateFields.push(`"updatedAt" = $${paramIndex++}`)
    updateValues.push(new Date())
    updateValues.push(resolvedParams.id)

    const result = await query(
      `UPDATE "Lead" SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      updateValues
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    )
  }
}

// DELETE lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    // Delete related activities first
    await query(
      'DELETE FROM "LeadActivity" WHERE "leadId" = $1',
      [resolvedParams.id]
    )

    // Delete the lead
    const result = await query(
      'DELETE FROM "Lead" WHERE id = $1 RETURNING *',
      [resolvedParams.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Lead deleted successfully' })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}