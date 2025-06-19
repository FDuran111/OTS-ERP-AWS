import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET all vendors
export async function GET() {
  try {
    const result = await query(
      'SELECT * FROM "Vendor" WHERE active = true ORDER BY name ASC'
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}

// POST create new vendor
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, code, contactName, email, phone, address } = body

    // Check if vendor code already exists
    const existingResult = await query(
      'SELECT id FROM "Vendor" WHERE code = $1',
      [code]
    )

    if (existingResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Vendor code already exists' },
        { status: 400 }
      )
    }

    const result = await query(
      `INSERT INTO "Vendor" (
        id, name, code, "contactName", email, phone, address, active, "createdAt", "updatedAt"
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, $7, $8)
      RETURNING *`,
      [
        name,
        code,
        contactName || null,
        email || null,
        phone || null,
        address || null,
        new Date(),
        new Date()
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Error creating vendor:', error)
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    )
  }
}