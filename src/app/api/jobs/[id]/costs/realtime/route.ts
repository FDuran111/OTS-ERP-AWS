import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// GET real-time job cost information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const client = await pool.connect()
    
    try {
      // Get all data in parallel for real-time dashboard
      const [
        activeTimeEntriesResult,
        todaysCostsResult,
        budgetComparisonResult,
        recentActivityResult
      ] = await Promise.all([
        // Active time entries with current estimated cost
        client.query(`
          SELECT 
            te.id,
            te."userId",
            te."startTime",
            te."regularRate",
            u.name as "userName",
            j."jobNumber",
            j.description as "jobTitle",
            EXTRACT(EPOCH FROM (NOW() - te."startTime")) / 3600 as "currentHours",
            CASE 
              WHEN EXTRACT(EPOCH FROM (NOW() - te."startTime")) / 3600 > 8 
              THEN (8 * COALESCE(te."regularRate", 25.00)) + 
                   ((EXTRACT(EPOCH FROM (NOW() - te."startTime")) / 3600 - 8) * COALESCE(te."regularRate", 25.00) * 1.5)
              ELSE (EXTRACT(EPOCH FROM (NOW() - te."startTime")) / 3600) * COALESCE(te."regularRate", 25.00)
            END as "estimatedCost",
            NULL as "clockInLatitude",
            NULL as "clockInLongitude"
          FROM "TimeEntry" te
          JOIN "User" u ON te."userId" = u.id
          LEFT JOIN "Job" j ON te."jobId" = j.id
          WHERE te."jobId" = $1 AND te.status = 'ACTIVE'
          ORDER BY te."startTime" ASC
        `, [resolvedParams.id]),
        
        // Today's completed costs
        client.query(`
          SELECT 
            COUNT(*) as "completedEntries",
            COALESCE(SUM("hours"), 0) as "totalHours",
            COALESCE(SUM("totalCost"), 0) as "totalCost",
            COALESCE(AVG("regularRate"), 0) as "avgRate"
          FROM "TimeEntry"
          WHERE "jobId" = $1 
            AND status = 'COMPLETED'
            AND DATE("startTime") = CURRENT_DATE
        `, [resolvedParams.id]),
        
        // Budget comparison
        client.query(`
          SELECT 
            j."estimatedValue",
            j."billedAmount",
            COALESCE(jc."totalJobCost", 0) as "actualCosts",
            COALESCE(jc."totalLaborCost", 0) as "laborCosts",
            COALESCE(jc."totalMaterialCost", 0) as "materialCosts",
            COALESCE(jc."totalEquipmentCost", 0) as "equipmentCosts"
          FROM "Job" j
          LEFT JOIN "JobCost" jc ON j.id = jc."jobId"
          WHERE j.id = $1
        `, [resolvedParams.id]),
        
        // Recent cost activity (last 24 hours)
        client.query(`
          SELECT 
            te.id,
            te."userId",
            u.name as "userName",
            te."startTime",
            te."endTime",
            te."hours",
            te."totalCost",
            te."regularRate",
            te."description"
          FROM "TimeEntry" te
          JOIN "User" u ON te."userId" = u.id
          WHERE te."jobId" = $1 
            AND te.status = 'COMPLETED'
            AND te."endTime" >= NOW() - INTERVAL '24 hours'
          ORDER BY te."endTime" DESC
          LIMIT 10
        `, [resolvedParams.id])
      ])

      // Calculate active costs
      const activeEntries = activeTimeEntriesResult.rows.map(row => ({
        id: row.id,
        userId: row.userId,
        userName: row.userName,
        jobNumber: row.jobNumber,
        jobTitle: row.jobTitle,
        startTime: row.startTime,
        currentHours: parseFloat(row.currentHours || 0),
        estimatedCost: parseFloat(row.estimatedCost || 0),
        hourlyRate: parseFloat(row.regularRate || 0),
        location: row.clockInLatitude && row.clockInLongitude ? {
          latitude: parseFloat(row.clockInLatitude),
          longitude: parseFloat(row.clockInLongitude)
        } : null
      }))

      // Today's summary
      const todaysSummary = todaysCostsResult.rows[0]
      const todaysData = {
        completedEntries: parseInt(todaysSummary.completedEntries),
        totalHours: parseFloat(todaysSummary.totalHours),
        totalCost: parseFloat(todaysSummary.totalCost),
        averageRate: parseFloat(todaysSummary.avgRate)
      }

      // Current active costs
      const activeCosts = {
        activeWorkers: activeEntries.length,
        totalActiveHours: activeEntries.reduce((sum, entry) => sum + entry.currentHours, 0),
        totalEstimatedCost: activeEntries.reduce((sum, entry) => sum + entry.estimatedCost, 0)
      }

      // Budget analysis
      const budget = budgetComparisonResult.rows[0]
      const budgetData = budget ? {
        estimatedValue: parseFloat(budget.estimatedValue || 0),
        billedAmount: parseFloat(budget.billedAmount || 0),
        actualCosts: parseFloat(budget.actualCosts || 0),
        laborCosts: parseFloat(budget.laborCosts || 0),
        materialCosts: parseFloat(budget.materialCosts || 0),
        equipmentCosts: parseFloat(budget.equipmentCosts || 0),
        remainingBudget: parseFloat(budget.estimatedValue || 0) - parseFloat(budget.actualCosts || 0),
        costPercentage: budget.estimatedValue > 0 ? 
          (parseFloat(budget.actualCosts || 0) / parseFloat(budget.estimatedValue)) * 100 : 0
      } : null

      // Recent activity
      const recentActivity = recentActivityResult.rows.map(row => ({
        id: row.id,
        userId: row.userId,
        userName: row.userName,
        startTime: row.startTime,
        endTime: row.endTime,
        totalHours: parseFloat(row.hours || 0),
        totalCost: parseFloat(row.totalCost || 0),
        hourlyRate: parseFloat(row.regularRate || 0),
        workDescription: row.description
      }))

      // Calculate burn rate (cost per hour over last week)
      const burnRateResult = await client.query(`
        SELECT 
          COALESCE(AVG("totalCost" / NULLIF("hours", 0)), 0) as "avgCostPerHour",
          COUNT(*) as "weeklyEntries",
          COALESCE(SUM("totalCost"), 0) as "weeklyTotal"
        FROM "TimeEntry"
        WHERE "jobId" = $1 
          AND status = 'COMPLETED'
          AND "endTime" >= NOW() - INTERVAL '7 days'
      `, [resolvedParams.id])

      const burnRate = burnRateResult.rows[0]
      const burnRateData = {
        avgCostPerHour: parseFloat(burnRate.avgCostPerHour || 0),
        weeklyEntries: parseInt(burnRate.weeklyEntries),
        weeklyTotal: parseFloat(burnRate.weeklyTotal || 0)
      }

      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        activeEntries,
        activeCosts,
        todaysSummary: todaysData,
        budgetAnalysis: budgetData,
        recentActivity,
        burnRate: burnRateData,
        summary: {
          totalEstimatedCurrentCost: activeCosts.totalEstimatedCost + todaysData.totalCost,
          activeWorkers: activeCosts.activeWorkers,
          todaysTotalHours: activeCosts.totalActiveHours + todaysData.totalHours,
          projectedDailyCost: todaysData.totalCost + activeCosts.totalEstimatedCost,
          budgetHealth: budgetData ? {
            status: budgetData.costPercentage > 90 ? 'DANGER' : 
                   budgetData.costPercentage > 75 ? 'WARNING' : 'GOOD',
            percentage: budgetData.costPercentage,
            remaining: budgetData.remainingBudget
          } : null
        }
      })

    } finally {
      client.release()
    }

  } catch (error) {
    console.error('Error fetching real-time job costs:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch real-time job costs',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}