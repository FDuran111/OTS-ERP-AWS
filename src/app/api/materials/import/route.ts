import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'
import { withRBAC } from '@/lib/rbac-middleware'
import { parse } from 'csv-parse/sync'

const materialSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  unit: z.string().min(1, 'Unit is required'),
  cost: z.number().min(0, 'Cost must be positive'),
  price: z.number().min(0, 'Price must be positive'),
  markup: z.number().min(0, 'Markup must be positive').default(1.5),
  inStock: z.number().int().min(0, 'Stock must be non-negative').default(0),
  minStock: z.number().int().min(0, 'Min stock must be non-negative').default(0),
  location: z.string().optional(),
  vendorCode: z.string().optional(),
  active: z.boolean().default(true),
})

// Validation schemas
const importModeSchema = z.enum(['create', 'update', 'upsert'])

// POST import materials from CSV
export const POST = withRBAC({
  requiredRoles: ['OWNER_ADMIN']
})(async (request: NextRequest) => {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const modeRaw = formData.get('mode') as string
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      )
    }

    // Validate mode
    const modeValidation = importModeSchema.safeParse(modeRaw)
    if (!modeValidation.success) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be "create", "update", or "upsert"' },
        { status: 400 }
      )
    }
    const mode = modeValidation.data

    // Parse CSV with error handling
    let content: string
    let records: any[]
    
    try {
      content = await file.text()
      records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })
    } catch (parseError: any) {
      return NextResponse.json(
        { error: `Failed to parse CSV: ${parseError.message}` },
        { status: 400 }
      )
    }

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ row: number; code: string; error: string }>,
    }

    // Process each row
    for (let i = 0; i < records.length; i++) {
      const row = records[i] as Record<string, any>
      const rowNum = i + 2 // +2 for 1-indexed and header row

      try {
        // Parse active flag properly
        const activeValue = row.Active || row.active
        let active = true // default
        if (activeValue !== undefined && activeValue !== null && activeValue !== '') {
          const activeStr = String(activeValue).toLowerCase().trim()
          active = ['yes', 'true', '1'].includes(activeStr)
        }

        // Parse and validate row data
        const materialData = materialSchema.parse({
          code: row.Code || row.code,
          name: row.Name || row.name,
          description: row.Description || row.description || '',
          manufacturer: row.Manufacturer || row.manufacturer || '',
          category: row.Category || row.category,
          unit: row.Unit || row.unit,
          cost: parseFloat(row.Cost || row.cost || '0'),
          price: parseFloat(row.Price || row.price || '0'),
          markup: parseFloat(row.Markup || row.markup || '1.5'),
          inStock: parseInt(row['In Stock'] || row.inStock || '0', 10),
          minStock: parseInt(row['Min Stock'] || row.minStock || '0', 10),
          location: row.Location || row.location || '',
          vendorCode: row['Vendor Code'] || row.vendorCode || '',
          active,
        })

        // Check if material exists
        const existingMaterial = await query(
          `SELECT id FROM "Material" WHERE code = $1`,
          [materialData.code]
        )

        const exists = existingMaterial.rows.length > 0

        if (mode === 'create' && exists) {
          results.errors.push({
            row: rowNum,
            code: materialData.code,
            error: 'Material already exists',
          })
          results.failed++
          continue
        }

        if (mode === 'update' && !exists) {
          results.errors.push({
            row: rowNum,
            code: materialData.code,
            error: 'Material not found',
          })
          results.failed++
          continue
        }

        // Lookup vendor by vendor code if provided
        let vendorId = null
        if (materialData.vendorCode) {
          const vendorResult = await query(
            `SELECT id FROM "Vendor" WHERE code = $1`,
            [materialData.vendorCode]
          )
          if (vendorResult.rows.length > 0) {
            vendorId = vendorResult.rows[0].id
          } else {
            results.errors.push({
              row: rowNum,
              code: materialData.code,
              error: `Vendor code "${materialData.vendorCode}" not found`,
            })
            results.failed++
            continue
          }
        }

        if (mode === 'update' || (mode === 'upsert' && exists)) {
          // Update existing material - only update vendorId if explicitly provided
          if (materialData.vendorCode && vendorId) {
            await query(
              `UPDATE "Material"
               SET name = $1,
                   description = $2,
                   manufacturer = $3,
                   category = $4,
                   unit = $5,
                   cost = $6,
                   price = $7,
                   markup = $8,
                   "inStock" = $9,
                   "minStock" = $10,
                   location = $11,
                   "vendorId" = $12,
                   active = $13,
                   "updatedAt" = NOW()
               WHERE code = $14`,
              [
                materialData.name,
                materialData.description,
                materialData.manufacturer,
                materialData.category,
                materialData.unit,
                materialData.cost,
                materialData.price,
                materialData.markup,
                materialData.inStock,
                materialData.minStock,
                materialData.location,
                vendorId,
                materialData.active,
                materialData.code,
              ]
            )
          } else {
            // Update without changing vendorId
            await query(
              `UPDATE "Material"
               SET name = $1,
                   description = $2,
                   manufacturer = $3,
                   category = $4,
                   unit = $5,
                   cost = $6,
                   price = $7,
                   markup = $8,
                   "inStock" = $9,
                   "minStock" = $10,
                   location = $11,
                   active = $12,
                   "updatedAt" = NOW()
               WHERE code = $13`,
              [
                materialData.name,
                materialData.description,
                materialData.manufacturer,
                materialData.category,
                materialData.unit,
                materialData.cost,
                materialData.price,
                materialData.markup,
                materialData.inStock,
                materialData.minStock,
                materialData.location,
                materialData.active,
                materialData.code,
              ]
            )
          }
        } else {
          // Create new material
          await query(
            `INSERT INTO "Material" 
             (code, name, description, manufacturer, category, unit, cost, price, markup, 
              "inStock", "minStock", location, "vendorId", active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              materialData.code,
              materialData.name,
              materialData.description,
              materialData.manufacturer,
              materialData.category,
              materialData.unit,
              materialData.cost,
              materialData.price,
              materialData.markup,
              materialData.inStock,
              materialData.minStock,
              materialData.location,
              vendorId,
              materialData.active,
            ]
          )
        }

        results.successful++
      } catch (error: any) {
        console.error(`Error processing row ${rowNum}:`, error)
        results.errors.push({
          row: rowNum,
          code: row.Code || row.code || 'Unknown',
          error: error.message || 'Unknown error',
        })
        results.failed++
      }
    }

    return NextResponse.json({
      message: `Import completed: ${results.successful} successful, ${results.failed} failed`,
      ...results,
    })
  } catch (error) {
    console.error('Error importing materials:', error)
    return NextResponse.json(
      { error: 'Failed to import materials' },
      { status: 500 }
    )
  }
})
