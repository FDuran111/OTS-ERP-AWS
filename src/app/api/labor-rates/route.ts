import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

// GET all labor rates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') !== 'false'

    let whereClause = ''
    if (activeOnly) {
      whereClause = 'WHERE active = true'
    }

    const result = await query(`
      SELECT 
        id,
        name,
        description,
        "hourlyRate",
        "skillLevel",
        active,
        "createdAt",
        "updatedAt"
      FROM "LaborRate" 
      ${whereClause}
      ORDER BY "skillLevel", "hourlyRate" DESC
    `)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error fetching labor rates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch labor rates' },
      { status: 500 }
    )
  }
}

const laborRateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  hourlyRate: z.number().positive('Hourly rate must be positive'),
  skillLevel: z.string().min(1, 'Skill level is required'),
})

// POST create new labor rate
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = laborRateSchema.parse(body)

    // Check for existing rate with same name
    const existingRate = await query(
      'SELECT id FROM "LaborRate" WHERE name = $1 AND active = true',
      [data.name]
    )

    if (existingRate.rows.length > 0) {
      return NextResponse.json(
        { error: 'A labor rate with this name already exists' },
        { status: 400 }
      )
    }

    // Generate a unique ID
    const id = `clr_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    const result = await query(
      `INSERT INTO "LaborRate" (
        id, name, description, "hourlyRate", "skillLevel", 
        active, "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
      [
        id,
        data.name,
        data.description || null,
        data.hourlyRate,
        data.skillLevel,
        true
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating labor rate:', error)
    return NextResponse.json(
      { error: 'Failed to create labor rate' },
      { status: 500 }
    )
  }
}