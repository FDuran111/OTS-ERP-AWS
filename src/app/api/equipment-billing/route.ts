import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET equipment billing summary and analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const equipmentType = searchParams.get('equipmentType')
    const jobId = searchParams.get('jobId')

    let whereClause = 'WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (dateFrom) {
      whereClause += ` AND "usageDate" >= $${paramIndex}`
      params.push(dateFrom)
      paramIndex++
    }

    if (dateTo) {
      whereClause += ` AND "usageDate" <= $${paramIndex}`
      params.push(dateTo)
      paramIndex++
    }

    if (equipmentType) {
      whereClause += ` AND "equipmentType" = $${paramIndex}`
      params.push(equipmentType)
      paramIndex++
    }

    if (jobId) {
      whereClause += ` AND "jobId" = $${paramIndex}`
      params.push(jobId)
      paramIndex++
    }

    // Get detailed billing data
    const billingSummary = await query(`
      SELECT * FROM "EquipmentBillingSummary"
      ${whereClause}
      ORDER BY "usageDate" DESC
    `, params)

    // Get summary statistics
    const summaryStats = await query(`
      SELECT 
        COUNT(*) as "totalUsages",
        COUNT(DISTINCT "jobId") as "totalJobs",
        COUNT(DISTINCT "equipmentType") as "equipmentTypes",
        SUM("totalCost") as "totalRevenue",
        SUM("billableHours") as "totalBillableHours",
        AVG("utilizationPercent") as "avgUtilization",
        AVG("effectiveHourlyRate") as "avgEffectiveRate"
      FROM "EquipmentBillingSummary"
      ${whereClause}
    `, params)

    // Get equipment type breakdown
    const equipmentBreakdown = await query(`
      SELECT 
        "equipmentType",
        COUNT(*) as "usageCount",
        SUM("totalCost") as "revenue",
        SUM("billableHours") as "hours",
        AVG("utilizationPercent") as "avgUtilization"
      FROM "EquipmentBillingSummary"
      ${whereClause}
      GROUP BY "equipmentType"
      ORDER BY "revenue" DESC
    `, params)

    // Get top performing equipment by revenue
    const topEquipment = await query(`
      SELECT 
        "equipmentName",
        "equipmentType",
        COUNT(*) as "usageCount",
        SUM("totalCost") as "revenue",
        SUM("billableHours") as "hours",
        AVG("utilizationPercent") as "avgUtilization"
      FROM "EquipmentBillingSummary"
      ${whereClause}
      GROUP BY "equipmentName", "equipmentType"
      ORDER BY "revenue" DESC
      LIMIT 10
    `, params)

    // Get monthly trends (if date range spans multiple months)
    const monthlyTrends = await query(`
      SELECT 
        DATE_TRUNC('month', "usageDate") as "month",
        COUNT(*) as "usageCount",
        SUM("totalCost") as "revenue",
        SUM("billableHours") as "hours",
        AVG("utilizationPercent") as "avgUtilization"
      FROM "EquipmentBillingSummary"
      ${whereClause}
      GROUP BY DATE_TRUNC('month', "usageDate")
      ORDER BY "month" DESC
      LIMIT 12
    `, params)

    const response = {
      billingData: billingSummary.rows.map(row => ({
        usageId: row.usageId,
        jobId: row.jobId,
        jobNumber: row.jobNumber,
        jobDescription: row.jobDescription,
        equipmentName: row.equipmentName,
        equipmentType: row.equipmentType,
        usageDate: row.usageDate,
        operatorName: row.operatorName,
        totalHours: parseFloat(row.totalHours || 0),
        billableHours: parseFloat(row.billableHours || 0),
        workingHours: parseFloat(row.workingHours || 0),
        travelHours: parseFloat(row.travelHours || 0),
        setupHours: parseFloat(row.setupHours || 0),
        idleHours: parseFloat(row.idleHours || 0),
        hourlyRate: parseFloat(row.hourlyRate || 0),
        appliedMultiplier: parseFloat(row.appliedMultiplier || 1),
        baseCost: parseFloat(row.baseCost || 0),
        travelCost: parseFloat(row.travelCost || 0),
        setupCost: parseFloat(row.setupCost || 0),
        operatorCost: parseFloat(row.operatorCost || 0),
        totalCost: parseFloat(row.totalCost || 0),
        utilizationPercent: parseFloat(row.utilizationPercent || 0),
        effectiveHourlyRate: parseFloat(row.effectiveHourlyRate || 0),
        status: row.status,
        notes: row.notes,
        createdAt: row.createdAt
      })),
      
      summary: {
        totalUsages: parseInt(summaryStats.rows[0]?.totalUsages || 0),
        totalJobs: parseInt(summaryStats.rows[0]?.totalJobs || 0),
        equipmentTypes: parseInt(summaryStats.rows[0]?.equipmentTypes || 0),
        totalRevenue: parseFloat(summaryStats.rows[0]?.totalRevenue || 0),
        totalBillableHours: parseFloat(summaryStats.rows[0]?.totalBillableHours || 0),
        avgUtilization: parseFloat(summaryStats.rows[0]?.avgUtilization || 0),
        avgEffectiveRate: parseFloat(summaryStats.rows[0]?.avgEffectiveRate || 0)
      },
      
      equipmentBreakdown: equipmentBreakdown.rows.map(row => ({
        equipmentType: row.equipmentType,
        usageCount: parseInt(row.usageCount),
        revenue: parseFloat(row.revenue || 0),
        hours: parseFloat(row.hours || 0),
        avgUtilization: parseFloat(row.avgUtilization || 0)
      })),
      
      topEquipment: topEquipment.rows.map(row => ({
        equipmentName: row.equipmentName,
        equipmentType: row.equipmentType,
        usageCount: parseInt(row.usageCount),
        revenue: parseFloat(row.revenue || 0),
        hours: parseFloat(row.hours || 0),
        avgUtilization: parseFloat(row.avgUtilization || 0)
      })),
      
      monthlyTrends: monthlyTrends.rows.map(row => ({
        month: row.month,
        usageCount: parseInt(row.usageCount),
        revenue: parseFloat(row.revenue || 0),
        hours: parseFloat(row.hours || 0),
        avgUtilization: parseFloat(row.avgUtilization || 0)
      }))
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching equipment billing data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch equipment billing data' },
      { status: 500 }
    )
  }
}