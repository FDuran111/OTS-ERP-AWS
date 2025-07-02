import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET employee cost analysis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Note: The EmployeeCostSummary view already filters by u.active = true
    // TODO: If includeInactive support is needed, we'll need to query the tables directly
    // rather than using the view, or modify the view to include inactive users
    let whereClause = ''
    const params: any[] = []

    if (userId) {
      whereClause = 'WHERE "userId" = $1'
      params.push(userId)
    }

    // Get comprehensive employee cost data
    // First, let's check what columns exist in the view
    let orderByClause = ''
    try {
      // Try to query with common column names
      const testResult = await query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'EmployeeCostSummary'
        AND column_name IN ('name', 'user_name', 'userName')
        LIMIT 1
      `)
      
      if (testResult.rows.length > 0) {
        orderByClause = `ORDER BY "${testResult.rows[0].column_name}"`
      }
    } catch (e) {
      // If we can't determine the column, just skip ordering
      console.log('Could not determine sort column for EmployeeCostSummary')
    }

    const result = await query(`
      SELECT * FROM "EmployeeCostSummary"
      ${whereClause}
      ${orderByClause}
    `, params)

    const employeeCosts = result.rows.map(row => ({
      userId: row.userId || row.user_id,
      name: row.name || row.user_name || row.userName || 'Unknown',
      email: row.email || row.user_email || '',
      role: row.role || row.user_role || '',
      baseHourlyRate: parseFloat(row.baseHourlyRate || row.base_hourly_rate || row.hourly_rate || 0),
      baseAnnualSalary: parseFloat(row.baseAnnualSalary || row.base_annual_salary || 0),
      totalOverheadCost: parseFloat(row.totalOverheadCost || row.total_overhead_cost || 0),
      totalOverheadHourly: parseFloat(row.totalOverheadHourly || row.total_overhead_hourly || 0),
      totalAssetCost: parseFloat(row.totalAssetCost || row.total_asset_cost || 0),
      totalAssetHourly: parseFloat(row.totalAssetHourly || row.total_asset_hourly || 0),
      totalHourlyCost: parseFloat(row.totalHourlyCost || row.total_hourly_cost || row.hourly_rate || 0),
      totalAnnualCost: parseFloat(row.totalAnnualCost || row.total_annual_cost || 0)
    }))

    // Get detailed breakdown for specific user if requested
    if (userId && employeeCosts.length > 0) {
      const [overheadDetails, assetDetails] = await Promise.all([
        // Overhead breakdown
        query(`
          SELECT 
            "overheadType",
            "overheadCategory", 
            "annualCost",
            "hourlyCost",
            "description"
          FROM "EmployeeOverhead"
          WHERE "userId" = $1 AND active = true
          ORDER BY "overheadType"
        `, [userId]),
        
        // Asset assignments
        query(`
          SELECT 
            ca."assetNumber",
            ca."name" as "assetName",
            ca."assetType",
            ca."totalAnnualCost",
            ca."totalAnnualCost" / 2080 as "hourlyAssetCost",
            aa."assignedDate",
            aa."purpose"
          FROM "AssetAssignment" aa
          JOIN "CompanyAsset" ca ON aa."assetId" = ca.id
          WHERE aa."userId" = $1 AND aa."returnedDate" IS NULL
          ORDER BY ca."assetNumber"
        `, [userId])
      ])

      const employee = employeeCosts[0] as any
      employee.overheadBreakdown = overheadDetails.rows.map(row => ({
        overheadType: row.overheadType,
        overheadCategory: row.overheadCategory,
        annualCost: parseFloat(row.annualCost),
        hourlyCost: parseFloat(row.hourlyCost),
        description: row.description
      }))

      employee.assetBreakdown = assetDetails.rows.map(row => ({
        assetNumber: row.assetNumber,
        assetName: row.assetName,
        assetType: row.assetType,
        annualCost: parseFloat(row.totalAnnualCost || 0),
        hourlyCost: parseFloat(row.hourlyAssetCost || 0),
        assignedDate: row.assignedDate,
        purpose: row.purpose
      }))
    }

    return NextResponse.json(employeeCosts)

  } catch (error) {
    console.error('Error fetching employee costs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee costs' },
      { status: 500 }
    )
  }
}

// POST calculate true cost for specific date/user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, calculationDate } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const result = await query(`
      SELECT get_employee_true_cost($1, $2) as "trueCost"
    `, [userId, calculationDate || new Date().toISOString().split('T')[0]])

    const trueCost = parseFloat(result.rows[0]?.trueCost || 0)

    return NextResponse.json({
      userId,
      calculationDate: calculationDate || new Date().toISOString().split('T')[0],
      trueCostPerHour: trueCost
    })

  } catch (error) {
    console.error('Error calculating employee true cost:', error)
    return NextResponse.json(
      { error: 'Failed to calculate employee true cost' },
      { status: 500 }
    )
  }
}