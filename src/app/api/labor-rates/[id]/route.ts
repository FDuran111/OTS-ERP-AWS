import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const updateLaborRateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  hourlyRate: z.number().positive().optional(),
  skillLevel: z.enum(['APPRENTICE', 'HELPER', 'TECH_L1', 'TECH_L2', 'JOURNEYMAN', 'FOREMAN', 'LOW_VOLTAGE', 'CABLING', 'INSTALL']).optional(),
  category: z.enum(['ELECTRICAL', 'LOW_VOLTAGE', 'SERVICE', 'INSTALL', 'SPECIALTY']).optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
  active: z.boolean().optional(),
})

// GET specific labor rate
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query(
      'SELECT * FROM "LaborRate" WHERE id = $1',
      [params.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Labor rate not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching labor rate:', error)
    return NextResponse.json(
      { error: 'Failed to fetch labor rate' },
      { status: 500 }
    )
  }
}

// PUT update labor rate
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = updateLaborRateSchema.parse(body)

    // Check if rate exists
    const existingRate = await query(
      'SELECT id FROM "LaborRate" WHERE id = $1',
      [params.id]
    )

    if (existingRate.rows.length === 0) {
      return NextResponse.json(
        { error: 'Labor rate not found' },
        { status: 404 }
      )
    }

    // Check for name conflicts if updating name
    if (data.name) {
      const nameConflict = await query(
        'SELECT id FROM "LaborRate" WHERE name = $1 AND id != $2 AND active = true',
        [data.name, params.id]
      )

      if (nameConflict.rows.length > 0) {
        return NextResponse.json(
          { error: 'A labor rate with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Build dynamic update query
    const updateFields = []
    const values = []
    let paramIndex = 1

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        if (key === 'effectiveDate' || key === 'expiryDate') {
          updateFields.push(`"${key}" = $${paramIndex}`)
          values.push(value ? new Date(value) : null)
        } else if (key === 'hourlyRate') {
          updateFields.push(`"${key}" = $${paramIndex}`)
          values.push(value)
        } else {
          updateFields.push(`"${key}" = $${paramIndex}`)
          values.push(value)
        }
        paramIndex++
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    updateFields.push(`"updatedAt" = NOW()`)
    values.push(params.id)

    const updateQuery = `
      UPDATE "LaborRate" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await query(updateQuery, values)
    return NextResponse.json(result.rows[0])
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating labor rate:', error)
    return NextResponse.json(
      { error: 'Failed to update labor rate' },
      { status: 500 }
    )
  }
}

// DELETE labor rate (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if rate exists
    const existingRate = await query(
      'SELECT id FROM "LaborRate" WHERE id = $1',
      [params.id]
    )

    if (existingRate.rows.length === 0) {
      return NextResponse.json(
        { error: 'Labor rate not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting active = false
    await query(
      'UPDATE "LaborRate" SET active = false, "updatedAt" = NOW() WHERE id = $1',
      [params.id]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting labor rate:', error)
    return NextResponse.json(
      { error: 'Failed to delete labor rate' },
      { status: 500 }
    )
  }
}