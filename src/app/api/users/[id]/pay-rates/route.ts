import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withRBAC } from '@/lib/rbac-middleware'
import { z } from 'zod'

const payRateSchema = z.object({
  regularRate: z.number().min(0).max(1000),
  overtimeRate: z.number().min(0).max(1500).optional(),
  doubleTimeRate: z.number().min(0).max(2000).optional(),
})

// GET user pay rates
export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN']
})(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: userId } = await params

    const result = await query(
      `SELECT
        id,
        name,
        email,
        "regularRate",
        "overtimeRate",
        "doubleTimeRate"
      FROM "User"
      WHERE id = $1`,
      [userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = result.rows[0]

    // Calculate default rates if not set
    const regularRate = parseFloat(user.regularRate) || 15.00
    const overtimeRate = parseFloat(user.overtimeRate) || (regularRate * 1.5)
    const doubleTimeRate = parseFloat(user.doubleTimeRate) || (regularRate * 2.0)

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      regularRate,
      overtimeRate,
      doubleTimeRate,
    })
  } catch (error) {
    console.error('Error fetching user pay rates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pay rates' },
      { status: 500 }
    )
  }
})

// PATCH update user pay rates
export const PATCH = withRBAC({
  requiredRoles: ['OWNER_ADMIN']
})(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: userId } = await params
    const body = await request.json()
    const data = payRateSchema.parse(body)

    // Calculate OT and DT rates if not provided
    const overtimeRate = data.overtimeRate ?? (data.regularRate * 1.5)
    const doubleTimeRate = data.doubleTimeRate ?? (data.regularRate * 2.0)

    const result = await query(
      `UPDATE "User"
      SET
        "regularRate" = $1,
        "overtimeRate" = $2,
        "doubleTimeRate" = $3,
        "updatedAt" = NOW()
      WHERE id = $4
      RETURNING id, name, email, "regularRate", "overtimeRate", "doubleTimeRate"`,
      [data.regularRate, overtimeRate, doubleTimeRate, userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0]
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating user pay rates:', error)
    return NextResponse.json(
      { error: 'Failed to update pay rates' },
      { status: 500 }
    )
  }
})