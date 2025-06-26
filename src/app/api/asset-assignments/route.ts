import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const assetAssignmentSchema = z.object({
  assetId: z.string().uuid(),
  userId: z.string().min(1),
  assignedDate: z.string().optional(),
  purpose: z.string().optional(),
  notes: z.string().optional(),
})

// GET asset assignments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const assetId = searchParams.get('assetId')
    const active = searchParams.get('active') !== 'false' // default to true

    let whereClause = 'WHERE 1=1'
    const params: any[] = []

    if (userId) {
      whereClause += ' AND aa."userId" = $1'
      params.push(userId)
    }

    if (assetId) {
      const paramIndex = params.length + 1
      whereClause += ` AND aa."assetId" = $${paramIndex}`
      params.push(assetId)
    }

    if (active) {
      whereClause += ' AND aa."returnedDate" IS NULL'
    }

    const result = await query(`
      SELECT 
        aa.*,
        ca."assetNumber",
        ca."name" as "assetName",
        ca."assetType",
        ca."category" as "assetCategory",
        u.name as "userName"
      FROM "AssetAssignment" aa
      LEFT JOIN "CompanyAsset" ca ON aa."assetId" = ca.id
      LEFT JOIN "User" u ON aa."userId" = u.id
      ${whereClause}
      ORDER BY aa."assignedDate" DESC
    `, params)

    const assignments = result.rows.map(row => ({
      id: row.id,
      assetId: row.assetId,
      userId: row.userId,
      assetNumber: row.assetNumber,
      assetName: row.assetName,
      assetType: row.assetType,
      assetCategory: row.assetCategory,
      userName: row.userName,
      assignedDate: row.assignedDate,
      returnedDate: row.returnedDate,
      purpose: row.purpose,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))

    return NextResponse.json(assignments)

  } catch (error) {
    console.error('Error fetching asset assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset assignments' },
      { status: 500 }
    )
  }
}

// POST create new asset assignment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = assetAssignmentSchema.parse(body)

    // Verify asset exists and is available
    const assetCheck = await query(`
      SELECT id, "assetNumber", name, status
      FROM "CompanyAsset" 
      WHERE id = $1 AND status = 'ACTIVE'
    `, [data.assetId])

    if (assetCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Asset not found or not available' },
        { status: 404 }
      )
    }

    // Verify user exists
    const userCheck = await query('SELECT id, name FROM "User" WHERE id = $1 AND active = true', [data.userId])
    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if asset is already assigned
    const existingAssignment = await query(`
      SELECT id FROM "AssetAssignment"
      WHERE "assetId" = $1 AND "returnedDate" IS NULL
    `, [data.assetId])

    if (existingAssignment.rows.length > 0) {
      return NextResponse.json(
        { error: 'Asset is already assigned to another user' },
        { status: 409 }
      )
    }

    const result = await query(`
      INSERT INTO "AssetAssignment" (
        "assetId", "userId", "assignedDate", "purpose", "notes"
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      data.assetId,
      data.userId,
      data.assignedDate || new Date().toISOString().split('T')[0],
      data.purpose || null,
      data.notes || null
    ])

    const assignment = result.rows[0]
    const asset = assetCheck.rows[0]
    const user = userCheck.rows[0]

    return NextResponse.json({
      id: assignment.id,
      assetId: assignment.assetId,
      userId: assignment.userId,
      assetNumber: asset.assetNumber,
      assetName: asset.name,
      userName: user.name,
      assignedDate: assignment.assignedDate,
      returnedDate: assignment.returnedDate,
      purpose: assignment.purpose,
      notes: assignment.notes,
      createdAt: assignment.createdAt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating asset assignment:', error)
    return NextResponse.json(
      { error: 'Failed to create asset assignment' },
      { status: 500 }
    )
  }
}

// PUT update asset assignment (mainly for returning assets)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { assignmentId, returnedDate, notes } = body

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      )
    }

    // Verify assignment exists
    const assignmentCheck = await query('SELECT id FROM "AssetAssignment" WHERE id = $1', [assignmentId])
    if (assignmentCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      )
    }

    const result = await query(`
      UPDATE "AssetAssignment"
      SET 
        "returnedDate" = $1,
        "notes" = COALESCE($2, "notes"),
        "updatedAt" = NOW()
      WHERE id = $3
      RETURNING *
    `, [
      returnedDate || new Date().toISOString().split('T')[0],
      notes,
      assignmentId
    ])

    const assignment = result.rows[0]

    return NextResponse.json({
      id: assignment.id,
      assetId: assignment.assetId,
      userId: assignment.userId,
      assignedDate: assignment.assignedDate,
      returnedDate: assignment.returnedDate,
      purpose: assignment.purpose,
      notes: assignment.notes,
      updatedAt: assignment.updatedAt
    })

  } catch (error) {
    console.error('Error updating asset assignment:', error)
    return NextResponse.json(
      { error: 'Failed to update asset assignment' },
      { status: 500 }
    )
  }
}