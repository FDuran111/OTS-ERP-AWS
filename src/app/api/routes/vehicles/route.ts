import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const vehicleSchema = z.object({
  vehicleNumber: z.string().min(1).max(50),
  vehicleName: z.string().min(1).max(100),
  vehicleType: z.string().optional(),
  capacity: z.number().min(1).max(10).optional(),
  licensePlate: z.string().max(20).optional(),
  vin: z.string().max(50).optional(),
  year: z.number().min(1900).max(2030).optional(),
  make: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  homeBaseAddress: z.string().optional(),
  homeBaseLat: z.number().min(-90).max(90).optional(),
  homeBaseLng: z.number().min(-180).max(180).optional(),
  fuelType: z.enum(['GASOLINE', 'DIESEL', 'ELECTRIC', 'HYBRID']).optional(),
  avgFuelConsumption: z.number().min(0).optional(),
  hourlyOperatingCost: z.number().min(0).optional(),
  mileageRate: z.number().min(0).optional(),
})

// GET vehicles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active') !== 'false'
    const vehicleType = searchParams.get('vehicleType')
    const includeStats = searchParams.get('includeStats') === 'true'

    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (active) {
      whereClause += ` AND active = $${paramIndex}`
      params.push(true)
      paramIndex++
    }

    if (vehicleType) {
      whereClause += ` AND "vehicleType" = $${paramIndex}`
      params.push(vehicleType)
      paramIndex++
    }

    const result = await query(`
      SELECT * FROM "Vehicle"
      ${whereClause}
      ORDER BY "vehicleNumber"
    `, params)

    let vehicles = result.rows.map(row => ({
      id: row.id,
      vehicleNumber: row.vehicleNumber,
      vehicleName: row.vehicleName,
      vehicleType: row.vehicleType,
      capacity: row.capacity,
      licensePlate: row.licensePlate,
      vin: row.vin,
      year: row.year,
      make: row.make,
      model: row.model,
      homeBaseAddress: row.homeBaseAddress,
      homeBaseLat: row.homeBaseLat ? parseFloat(row.homeBaseLat) : null,
      homeBaseLng: row.homeBaseLng ? parseFloat(row.homeBaseLng) : null,
      fuelType: row.fuelType,
      avgFuelConsumption: row.avgFuelConsumption ? parseFloat(row.avgFuelConsumption) : null,
      hourlyOperatingCost: row.hourlyOperatingCost ? parseFloat(row.hourlyOperatingCost) : null,
      mileageRate: row.mileageRate ? parseFloat(row.mileageRate) : null,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }))

    // Include vehicle statistics if requested
    if (includeStats) {
      const vehicleIds = vehicles.map(v => v.id)
      
      if (vehicleIds.length > 0) {
        const statsResult = await query(`
          SELECT 
            r."vehicleId",
            COUNT(r.id) as "totalRoutes",
            COUNT(CASE WHEN r.status = 'COMPLETED' THEN 1 END) as "completedRoutes",
            COUNT(CASE WHEN r.status = 'IN_PROGRESS' THEN 1 END) as "activeRoutes",
            ROUND(AVG(r."optimizationScore"), 2) as "avgOptimizationScore",
            SUM(r."actualDistance") as "totalDistance",
            SUM(r."actualCost") as "totalCost",
            MAX(r."routeDate") as "lastRouteDate"
          FROM "Route" r
          WHERE r."vehicleId" = ANY($1)
            AND r."routeDate" >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY r."vehicleId"
        `, [vehicleIds])

        const statsByVehicle = statsResult.rows.reduce((acc: any, stat: any) => {
          acc[stat.vehicleId] = {
            totalRoutes: parseInt(stat.totalRoutes || 0),
            completedRoutes: parseInt(stat.completedRoutes || 0),
            activeRoutes: parseInt(stat.activeRoutes || 0),
            avgOptimizationScore: parseFloat(stat.avgOptimizationScore || 0),
            totalDistance: parseFloat(stat.totalDistance || 0),
            totalCost: parseFloat(stat.totalCost || 0),
            lastRouteDate: stat.lastRouteDate
          }
          return acc
        }, {})

        vehicles = vehicles.map(vehicle => ({
          ...vehicle,
          stats: statsByVehicle[vehicle.id] || {
            totalRoutes: 0,
            completedRoutes: 0,
            activeRoutes: 0,
            avgOptimizationScore: 0,
            totalDistance: 0,
            totalCost: 0,
            lastRouteDate: null
          }
        }))
      }
    }

    return NextResponse.json(vehicles)

  } catch (error) {
    console.error('Error fetching vehicles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    )
  }
}

// POST create new vehicle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = vehicleSchema.parse(body)

    // Check if vehicle number already exists
    const existingVehicle = await query(
      'SELECT id FROM "Vehicle" WHERE "vehicleNumber" = $1',
      [data.vehicleNumber]
    )

    if (existingVehicle.rows.length > 0) {
      return NextResponse.json(
        { error: 'Vehicle number already exists' },
        { status: 409 }
      )
    }

    // Set default home base if not provided (Minneapolis area)
    const homeBaseLat = data.homeBaseLat || 44.9778
    const homeBaseLng = data.homeBaseLng || -93.2650

    const result = await query(`
      INSERT INTO "Vehicle" (
        "vehicleNumber", "vehicleName", "vehicleType", "capacity",
        "licensePlate", "vin", "year", "make", "model",
        "homeBaseAddress", "homeBaseLat", "homeBaseLng",
        "fuelType", "avgFuelConsumption", "hourlyOperatingCost", "mileageRate"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      data.vehicleNumber,
      data.vehicleName,
      data.vehicleType || 'SERVICE_TRUCK',
      data.capacity || 2,
      data.licensePlate || null,
      data.vin || null,
      data.year || null,
      data.make || null,
      data.model || null,
      data.homeBaseAddress || null,
      homeBaseLat,
      homeBaseLng,
      data.fuelType || 'GASOLINE',
      data.avgFuelConsumption || null,
      data.hourlyOperatingCost || 25.00,
      data.mileageRate || 0.65
    ])

    const vehicle = result.rows[0]

    return NextResponse.json({
      id: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      vehicleName: vehicle.vehicleName,
      vehicleType: vehicle.vehicleType,
      capacity: vehicle.capacity,
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      homeBaseAddress: vehicle.homeBaseAddress,
      homeBaseLat: parseFloat(vehicle.homeBaseLat),
      homeBaseLng: parseFloat(vehicle.homeBaseLng),
      fuelType: vehicle.fuelType,
      avgFuelConsumption: vehicle.avgFuelConsumption ? parseFloat(vehicle.avgFuelConsumption) : null,
      hourlyOperatingCost: parseFloat(vehicle.hourlyOperatingCost),
      mileageRate: parseFloat(vehicle.mileageRate),
      active: vehicle.active,
      createdAt: vehicle.createdAt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating vehicle:', error)
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    )
  }
}

// PUT update vehicle
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const data = vehicleSchema.partial().parse(body)

    // Check if vehicle exists
    const vehicleCheck = await query('SELECT id FROM "Vehicle" WHERE id = $1', [vehicleId])
    if (vehicleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Check for duplicate vehicle number if being updated
    if (data.vehicleNumber) {
      const duplicateCheck = await query(
        'SELECT id FROM "Vehicle" WHERE "vehicleNumber" = $1 AND id != $2',
        [data.vehicleNumber, vehicleId]
      )

      if (duplicateCheck.rows.length > 0) {
        return NextResponse.json(
          { error: 'Vehicle number already exists' },
          { status: 409 }
        )
      }
    }

    // Build update query dynamically
    const updateFields = []
    const values = []
    let paramIndex = 1

    const fieldMap = {
      vehicleNumber: '"vehicleNumber"',
      vehicleName: '"vehicleName"',
      vehicleType: '"vehicleType"',
      capacity: 'capacity',
      licensePlate: '"licensePlate"',
      vin: 'vin',
      year: 'year',
      make: 'make',
      model: 'model',
      homeBaseAddress: '"homeBaseAddress"',
      homeBaseLat: '"homeBaseLat"',
      homeBaseLng: '"homeBaseLng"',
      fuelType: '"fuelType"',
      avgFuelConsumption: '"avgFuelConsumption"',
      hourlyOperatingCost: '"hourlyOperatingCost"',
      mileageRate: '"mileageRate"'
    }

    for (const [key, dbField] of Object.entries(fieldMap)) {
      if (data[key as keyof typeof data] !== undefined) {
        updateFields.push(`${dbField} = $${paramIndex}`)
        values.push(data[key as keyof typeof data])
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
    values.push(vehicleId)

    const result = await query(`
      UPDATE "Vehicle" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values)

    const vehicle = result.rows[0]

    return NextResponse.json({
      id: vehicle.id,
      vehicleNumber: vehicle.vehicleNumber,
      vehicleName: vehicle.vehicleName,
      vehicleType: vehicle.vehicleType,
      capacity: vehicle.capacity,
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      homeBaseAddress: vehicle.homeBaseAddress,
      homeBaseLat: vehicle.homeBaseLat ? parseFloat(vehicle.homeBaseLat) : null,
      homeBaseLng: vehicle.homeBaseLng ? parseFloat(vehicle.homeBaseLng) : null,
      fuelType: vehicle.fuelType,
      avgFuelConsumption: vehicle.avgFuelConsumption ? parseFloat(vehicle.avgFuelConsumption) : null,
      hourlyOperatingCost: parseFloat(vehicle.hourlyOperatingCost),
      mileageRate: parseFloat(vehicle.mileageRate),
      active: vehicle.active,
      updatedAt: vehicle.updatedAt
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating vehicle:', error)
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    )
  }
}

// DELETE vehicle (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      )
    }

    // Check if vehicle exists
    const vehicleCheck = await query('SELECT id FROM "Vehicle" WHERE id = $1', [vehicleId])
    if (vehicleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Check for active routes
    const activeRoutes = await query(`
      SELECT COUNT(*) as count FROM "Route" 
      WHERE "vehicleId" = $1 AND status IN ('PLANNED', 'IN_PROGRESS')
    `, [vehicleId])

    if (parseInt(activeRoutes.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vehicle with active routes' },
        { status: 409 }
      )
    }

    // Soft delete by setting active = false
    await query(`
      UPDATE "Vehicle" 
      SET active = false, "updatedAt" = NOW()
      WHERE id = $1
    `, [vehicleId])

    return NextResponse.json({
      success: true,
      message: 'Vehicle deactivated successfully'
    })

  } catch (error) {
    console.error('Error deleting vehicle:', error)
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    )
  }
}