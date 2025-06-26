import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const routeSchema = z.object({
  routeName: z.string().min(1).max(100),
  routeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  vehicleId: z.string().uuid(),
  driverId: z.string().optional(),
  crewMembers: z.array(z.string()).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notes: z.string().optional(),
})

const routeUpdateSchema = z.object({
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  actualDuration: z.number().optional(),
  actualDistance: z.number().optional(),
  actualCost: z.number().optional(),
  notes: z.string().optional(),
})

// GET routes with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const routeDate = searchParams.get('routeDate')
    const vehicleId = searchParams.get('vehicleId')
    const status = searchParams.get('status')
    const driverId = searchParams.get('driverId')
    const includeStops = searchParams.get('includeStops') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (routeDate) {
      whereClause += ` AND r."routeDate" = $${paramIndex}`
      params.push(routeDate)
      paramIndex++
    }

    if (vehicleId) {
      whereClause += ` AND r."vehicleId" = $${paramIndex}`
      params.push(vehicleId)
      paramIndex++
    }

    if (status) {
      whereClause += ` AND r.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (driverId) {
      whereClause += ` AND r."driverId" = $${paramIndex}`
      params.push(driverId)
      paramIndex++
    }

    const offset = (page - 1) * limit

    const result = await query(`
      SELECT * FROM "RouteSummaryView" r
      ${whereClause}
      ORDER BY r."routeDate" DESC, r."startTime"
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset])

    const routes = result.rows.map(row => ({
      routeId: row.routeId,
      routeName: row.routeName,
      routeDate: row.routeDate,
      vehicleId: row.vehicleId,
      vehicleNumber: row.vehicleNumber,
      vehicleName: row.vehicleName,
      driverId: row.driverId,
      status: row.status,
      startTime: row.startTime,
      endTime: row.endTime,
      estimatedDuration: row.estimatedDuration,
      actualDuration: row.actualDuration,
      estimatedDistance: parseFloat(row.estimatedDistance || 0),
      actualDistance: parseFloat(row.actualDistance || 0),
      estimatedCost: parseFloat(row.estimatedCost || 0),
      actualCost: parseFloat(row.actualCost || 0),
      optimizationScore: parseFloat(row.optimizationScore || 0),
      totalStops: parseInt(row.totalStops || 0),
      jobStops: parseInt(row.jobStops || 0),
      completedStops: parseInt(row.completedStops || 0),
      inProgressStops: parseInt(row.inProgressStops || 0)
    }))

    // Include route stops if requested
    if (includeStops && routes.length > 0) {
      const routeIds = routes.map(r => r.routeId)
      const stopsResult = await query(`
        SELECT 
          rs.*,
          j."jobNumber",
          j.description as "jobDescription"
        FROM "RouteStop" rs
        LEFT JOIN "Job" j ON rs."jobId" = j.id
        WHERE rs."routeId" = ANY($1)
        ORDER BY rs."routeId", rs."stopOrder"
      `, [routeIds])

      // Group stops by route
      const stopsByRoute = stopsResult.rows.reduce((acc: any, stop: any) => {
        if (!acc[stop.routeId]) acc[stop.routeId] = []
        acc[stop.routeId].push({
          stopId: stop.id,
          jobId: stop.jobId,
          jobNumber: stop.jobNumber,
          jobDescription: stop.jobDescription,
          stopOrder: stop.stopOrder,
          stopType: stop.stopType,
          address: stop.address,
          latitude: parseFloat(stop.latitude),
          longitude: parseFloat(stop.longitude),
          estimatedArrival: stop.estimatedArrival,
          actualArrival: stop.actualArrival,
          estimatedDeparture: stop.estimatedDeparture,
          actualDeparture: stop.actualDeparture,
          estimatedDuration: stop.estimatedDuration,
          actualDuration: stop.actualDuration,
          travelTimeFromPrevious: stop.travelTimeFromPrevious,
          distanceFromPrevious: parseFloat(stop.distanceFromPrevious || 0),
          status: stop.status,
          notes: stop.notes
        })
        return acc
      }, {})

      // Add stops to routes
      routes.forEach(route => {
        (route as any).stops = stopsByRoute[route.routeId] || []
      })
    }

    return NextResponse.json(routes)

  } catch (error) {
    console.error('Error fetching routes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch routes' },
      { status: 500 }
    )
  }
}

// POST create new route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = routeSchema.parse(body)

    // Verify vehicle exists
    const vehicleCheck = await query(
      'SELECT id FROM "Vehicle" WHERE id = $1 AND active = true',
      [data.vehicleId]
    )

    if (vehicleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found or inactive' },
        { status: 404 }
      )
    }

    // Check for existing route on same date with same vehicle
    const existingRoute = await query(`
      SELECT id FROM "Route" 
      WHERE "routeDate" = $1 AND "vehicleId" = $2 AND status != 'CANCELLED'
    `, [data.routeDate, data.vehicleId])

    if (existingRoute.rows.length > 0) {
      return NextResponse.json(
        { error: 'Vehicle already has a route scheduled for this date' },
        { status: 409 }
      )
    }

    const result = await query(`
      INSERT INTO "Route" (
        "routeName", "routeDate", "vehicleId", "driverId", "crewMembers",
        "startTime", "endTime", "notes"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      data.routeName,
      data.routeDate,
      data.vehicleId,
      data.driverId || null,
      data.crewMembers || [],
      data.startTime || null,
      data.endTime || null,
      data.notes || null
    ])

    const route = result.rows[0]

    return NextResponse.json({
      routeId: route.id,
      routeName: route.routeName,
      routeDate: route.routeDate,
      vehicleId: route.vehicleId,
      driverId: route.driverId,
      crewMembers: route.crewMembers,
      status: route.status,
      startTime: route.startTime,
      endTime: route.endTime,
      notes: route.notes,
      createdAt: route.createdAt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating route:', error)
    return NextResponse.json(
      { error: 'Failed to create route' },
      { status: 500 }
    )
  }
}

// PUT update route
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const routeId = searchParams.get('routeId')

    if (!routeId) {
      return NextResponse.json(
        { error: 'Route ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const data = routeUpdateSchema.parse(body)

    // Check if route exists
    const routeCheck = await query('SELECT id FROM "Route" WHERE id = $1', [routeId])
    if (routeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      )
    }

    // Build update query dynamically
    const updateFields = []
    const values = []
    let paramIndex = 1

    if (data.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`)
      values.push(data.status)
      paramIndex++
    }

    if (data.actualDuration !== undefined) {
      updateFields.push(`"actualDuration" = $${paramIndex}`)
      values.push(data.actualDuration)
      paramIndex++
    }

    if (data.actualDistance !== undefined) {
      updateFields.push(`"actualDistance" = $${paramIndex}`)
      values.push(data.actualDistance)
      paramIndex++
    }

    if (data.actualCost !== undefined) {
      updateFields.push(`"actualCost" = $${paramIndex}`)
      values.push(data.actualCost)
      paramIndex++
    }

    if (data.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`)
      values.push(data.notes)
      paramIndex++
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    updateFields.push(`"updatedAt" = NOW()`)
    values.push(routeId)

    const result = await query(`
      UPDATE "Route" 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values)

    const route = result.rows[0]

    return NextResponse.json({
      routeId: route.id,
      routeName: route.routeName,
      routeDate: route.routeDate,
      vehicleId: route.vehicleId,
      status: route.status,
      actualDuration: route.actualDuration,
      actualDistance: parseFloat(route.actualDistance || 0),
      actualCost: parseFloat(route.actualCost || 0),
      notes: route.notes,
      updatedAt: route.updatedAt
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating route:', error)
    return NextResponse.json(
      { error: 'Failed to update route' },
      { status: 500 }
    )
  }
}

// DELETE route
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const routeId = searchParams.get('routeId')

    if (!routeId) {
      return NextResponse.json(
        { error: 'Route ID is required' },
        { status: 400 }
      )
    }

    // Check if route exists and can be deleted
    const routeCheck = await query(`
      SELECT id, status FROM "Route" WHERE id = $1
    `, [routeId])

    if (routeCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      )
    }

    const route = routeCheck.rows[0]

    // Don't allow deletion of in-progress or completed routes
    if (route.status === 'IN_PROGRESS' || route.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot delete in-progress or completed routes' },
        { status: 409 }
      )
    }

    // Delete route (cascade will delete route stops)
    await query('DELETE FROM "Route" WHERE id = $1', [routeId])

    return NextResponse.json({
      success: true,
      message: 'Route deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting route:', error)
    return NextResponse.json(
      { error: 'Failed to delete route' },
      { status: 500 }
    )
  }
}