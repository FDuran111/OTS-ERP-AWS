import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const updateLocationSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  type: z.enum(['WAREHOUSE', 'SHOP', 'TRUCK', 'OFFICE', 'SUPPLIER']).optional(),
  address: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})

// GET single storage location
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const result = await query(
      'SELECT * FROM "StorageLocation" WHERE id = $1',
      [resolvedParams.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Storage location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching storage location:', error)
    return NextResponse.json(
      { error: 'Failed to fetch storage location' },
      { status: 500 }
    )
  }
}

// PATCH /api/storage-locations/[id] - Update a storage location
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const { name, code, type, address, description } = body

    // Validate required fields
    if (!name || !code || !type) {
      return NextResponse.json(
        { error: 'Name, code, and type are required' },
        { status: 400 }
      )
    }

    // Check if name or code already exists (excluding current location)
    const existingResult = await query(
      'SELECT id FROM "StorageLocation" WHERE id != $1 AND (name = $2 OR code = $3)',
      [resolvedParams.id, name, code.toUpperCase()]
    )

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Storage location with this name or code already exists' },
        { status: 400 }
      )
    }

    const result = await query(
      `UPDATE "StorageLocation" SET 
        name = $1,
        code = $2,
        type = $3,
        address = $4,
        description = $5,
        "updatedAt" = $6
      WHERE id = $7 RETURNING *`,
      [
        name,
        code.toUpperCase(),
        type,
        address || null,
        description || null,
        new Date(),
        resolvedParams.id
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Storage location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error updating storage location:', error)
    return NextResponse.json(
      { error: 'Failed to update storage location' },
      { status: 500 }
    )
  }
}

// DELETE /api/storage-locations/[id] - Delete a storage location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    // Check if location is being used by any materials
    const usageResult = await query(
      'SELECT COUNT(*) as count FROM "Material" WHERE location = (SELECT code FROM "StorageLocation" WHERE id = $1)',
      [resolvedParams.id]
    )

    const usageCount = parseInt(usageResult.rows[0].count)

    if (usageCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location that has materials assigned to it. Please reassign or remove all materials first.' },
        { status: 400 }
      )
    }

    const result = await query(
      'DELETE FROM "StorageLocation" WHERE id = $1 RETURNING *',
      [resolvedParams.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Storage location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Storage location deleted successfully' })
  } catch (error) {
    console.error('Error deleting storage location:', error)
    return NextResponse.json(
      { error: 'Failed to delete storage location' },
      { status: 500 }
    )
  }
}