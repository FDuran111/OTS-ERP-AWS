import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const companyAssetSchema = z.object({
  assetNumber: z.string().min(1),
  assetType: z.enum(['VEHICLE', 'TRUCK', 'BUCKET_TRUCK', 'CRANE', 'GENERATOR', 'COMPRESSOR', 'TRAILER', 'TOOLS', 'PHONE', 'LAPTOP', 'OTHER']),
  category: z.enum(['FIELD_EQUIPMENT', 'OFFICE_EQUIPMENT', 'VEHICLE', 'TOOLS', 'TECHNOLOGY']),
  name: z.string().min(1),
  description: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  serialNumber: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  usefulLife: z.number().min(1).max(30).optional(),
  maintenanceCost: z.number().min(0).optional(),
  insuranceCost: z.number().min(0).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
})

// GET all company assets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const assetType = searchParams.get('assetType')
    const category = searchParams.get('category')
    const status = searchParams.get('status') || 'ACTIVE'

    let whereClause = 'WHERE ca.status = $1'
    const params: any[] = [status]

    if (assetType) {
      whereClause += ' AND ca."assetType" = $2'
      params.push(assetType)
    }

    if (category) {
      const paramIndex = params.length + 1
      whereClause += ` AND ca.category = $${paramIndex}`
      params.push(category)
    }

    const result = await query(`
      SELECT 
        ca.*,
        aa."userId" as "assignedUserId",
        u.name as "assignedUserName",
        aa."assignedDate",
        aa."purpose" as "assignmentPurpose"
      FROM "CompanyAsset" ca
      LEFT JOIN "AssetAssignment" aa ON ca.id = aa."assetId" AND aa."returnedDate" IS NULL
      LEFT JOIN "User" u ON aa."userId" = u.id
      ${whereClause}
      ORDER BY ca."assetNumber"
    `, params)

    const assets = result.rows.map(row => ({
      id: row.id,
      assetNumber: row.assetNumber,
      assetType: row.assetType,
      category: row.category,
      name: row.name,
      description: row.description,
      make: row.make,
      model: row.model,
      year: row.year,
      serialNumber: row.serialNumber,
      purchaseDate: row.purchaseDate,
      purchasePrice: row.purchasePrice ? parseFloat(row.purchasePrice) : null,
      currentValue: row.currentValue ? parseFloat(row.currentValue) : null,
      depreciationMethod: row.depreciationMethod,
      usefulLife: row.usefulLife,
      annualDepreciation: parseFloat(row.annualDepreciation || 0),
      maintenanceCost: parseFloat(row.maintenanceCost || 0),
      insuranceCost: parseFloat(row.insuranceCost || 0),
      totalAnnualCost: parseFloat(row.totalAnnualCost || 0),
      status: row.status,
      location: row.location,
      notes: row.notes,
      assignedUserId: row.assignedUserId,
      assignedUserName: row.assignedUserName,
      assignedDate: row.assignedDate,
      assignmentPurpose: row.assignmentPurpose,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))

    return NextResponse.json(assets)

  } catch (error) {
    console.error('Error fetching company assets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch company assets' },
      { status: 500 }
    )
  }
}

// POST create new company asset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = companyAssetSchema.parse(body)

    // Check if asset number already exists
    const existingAsset = await query('SELECT id FROM "CompanyAsset" WHERE "assetNumber" = $1', [data.assetNumber])
    if (existingAsset.rows.length > 0) {
      return NextResponse.json(
        { error: 'Asset number already exists' },
        { status: 409 }
      )
    }

    const result = await query(`
      INSERT INTO "CompanyAsset" (
        "assetNumber", "assetType", "category", "name", "description",
        "make", "model", "year", "serialNumber", "purchaseDate",
        "purchasePrice", "currentValue", "usefulLife", "maintenanceCost",
        "insuranceCost", "location", "notes"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      data.assetNumber,
      data.assetType,
      data.category,
      data.name,
      data.description || null,
      data.make || null,
      data.model || null,
      data.year || null,
      data.serialNumber || null,
      data.purchaseDate || null,
      data.purchasePrice || null,
      data.currentValue || null,
      data.usefulLife || 5,
      data.maintenanceCost || 0,
      data.insuranceCost || 0,
      data.location || null,
      data.notes || null
    ])

    const asset = result.rows[0]

    return NextResponse.json({
      id: asset.id,
      assetNumber: asset.assetNumber,
      assetType: asset.assetType,
      category: asset.category,
      name: asset.name,
      description: asset.description,
      make: asset.make,
      model: asset.model,
      year: asset.year,
      serialNumber: asset.serialNumber,
      purchaseDate: asset.purchaseDate,
      purchasePrice: asset.purchasePrice ? parseFloat(asset.purchasePrice) : null,
      currentValue: asset.currentValue ? parseFloat(asset.currentValue) : null,
      usefulLife: asset.usefulLife,
      maintenanceCost: parseFloat(asset.maintenanceCost || 0),
      insuranceCost: parseFloat(asset.insuranceCost || 0),
      totalAnnualCost: parseFloat(asset.totalAnnualCost || 0),
      status: asset.status,
      location: asset.location,
      notes: asset.notes,
      createdAt: asset.createdAt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating company asset:', error)
    return NextResponse.json(
      { error: 'Failed to create company asset' },
      { status: 500 }
    )
  }
}