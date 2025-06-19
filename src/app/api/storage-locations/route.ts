import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET /api/storage-locations - Get all storage locations
export async function GET() {
  try {
    const result = await query(
      'SELECT * FROM "StorageLocation" WHERE active = true ORDER BY name ASC'
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching storage locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch storage locations' },
      { status: 500 }
    )
  }
}

// POST /api/storage-locations - Create a new storage location
export async function POST(request: NextRequest) {
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

    // Check if name or code already exists
    const existingResult = await query(
      'SELECT id FROM "StorageLocation" WHERE name = $1 OR code = $2',
      [name, code.toUpperCase()]
    )

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Storage location with this name or code already exists' },
        { status: 400 }
      )
    }

    const result = await query(
      `INSERT INTO "StorageLocation" (
        id, name, code, type, address, description, active, "createdAt", "updatedAt"
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, $6, $7)
      RETURNING *`,
      [
        name,
        code.toUpperCase(),
        type,
        address || null,
        description || null,
        new Date(),
        new Date()
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Error creating storage location:', error)
    return NextResponse.json(
      { error: 'Failed to create storage location' },
      { status: 500 }
    )
  }
}