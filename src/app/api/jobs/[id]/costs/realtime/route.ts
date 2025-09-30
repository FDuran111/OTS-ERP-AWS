import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/db'

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
            te."clockInTime" as "startTime",
            u.name as "userName",
            j."jobNumber",
            j.description as "jobTitle",
            EXTRACT(EPOCH FROM (NOW() - te."clockInTime")) / 3600 as "currentHours",
            -- Use default rate of $75/hour for estimates
            CASE 
              WHEN EXTRACT(EPOCH FROM (NOW() - te."clockInTime")) / 3600 > 8 
              THEN (8 * 75.00) + 
                   ((EXTRACT(EPOCH FROM (NOW() - te."clockInTime")) / 3600 - 8) * 75.00 * 1.5)
              ELSE (EXTRACT(EPOCH FROM (NOW() - te."clockInTime")) / 3600) * 75.00
            END as "estimatedCost",
            te."clockInLatitude",
            te."clockInLongitude"
          FROM "TimeEntry" te
          JOIN "User" u ON te."userId" = u.id
          LEFT JOIN "Job" j ON te."jobId" = j.id
          WHERE te."jobId" = $1 AND te."clockOutTime" IS NULL
          ORDER BY te."startTime" ASC
        `, [resolvedParams.id]),
        
        // Today's completed costs
        client.query(`
          SELECT 
            COUNT(*) as "completedEntries",
            COALESCE(SUM("totalHours"), 0) as "totalHours",
            -- Calculate cost at $75/hour default rate
            COALESCE(SUM("totalHours" * 75.00), 0) as "totalCost",
            75.00 as "avgRate"
          FROM "TimeEntry"
          WHERE "jobId" = $1 
            AND "clockOutTime" IS NOT NULL
            AND DATE("clockInTime") = CURRENT_DATE
        `, [resolvedParams.id]),
        
        // Budget comparison
        client.query(`
          SELECT 
            j."estimatedValue",
            j."billedAmount",
            -- Calculate actual costs from time entries and material usage
            COALESCE((
              SELECT SUM(te."totalHours" * 75.00) 
              FROM "TimeEntry" te 
              WHERE te."jobId" = j.id
            ), 0) as "laborCosts",
            COALESCE((
              SELECT SUM(mu."totalCost") 
              FROM "MaterialUsage" mu 
              WHERE mu."jobId" = j.id
            ), 0) as "materialCosts",
            0 as "equipmentCosts"
          FROM "Job" j
          WHERE j.id = $1
        `, [resolvedParams.id]),
        
        // Recent cost activity (last 24 hours)
        client.query(`
          SELECT 
            te.id,
            te."userId",
            u.name as "userName",
            te."clockInTime" as "startTime",
            te."clockOutTime" as "endTime",
            te."totalHours" as "hours",
            -- Calculate cost at $75/hour default rate
            (te."hours" * 75.00) as "totalCost",
            te."description"
          FROM "TimeEntry" te
          JOIN "User" u ON te."userId" = u.id
          WHERE te."jobId" = $1 
            AND te."endTime" IS NOT NULL
            AND te."clockOutTime" >= NOW() - INTERVAL '24 hours'
          ORDER BY te."clockOutTime" DESC
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
        clockInTime: row.startTime,
        currentHours: parseFloat(row.currentHours || 0),
        estimatedCost: parseFloat(row.estimatedCost || 0),
        hourlyRate: 75.00, // Default rate
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
        laborCosts: parseFloat(budget.laborCosts || 0),
        materialCosts: parseFloat(budget.materialCosts || 0),
        equipmentCosts: parseFloat(budget.equipmentCosts || 0),
        actualCosts: parseFloat(budget.laborCosts || 0) + parseFloat(budget.materialCosts || 0),
        remainingBudget: parseFloat(budget.estimatedValue || 0) - (parseFloat(budget.laborCosts || 0) + parseFloat(budget.materialCosts || 0)),
        costPercentage: budget.estimatedValue > 0 ? 
          ((parseFloat(budget.laborCosts || 0) + parseFloat(budget.materialCosts || 0)) / parseFloat(budget.estimatedValue)) * 100 : 0
      } : null

      // Recent activity
      const recentActivity = recentActivityResult.rows.map(row => ({
        id: row.id,
        userId: row.userId,
        userName: row.userName,
        clockInTime: row.startTime,
        clockOutTime: row.endTime,
        totalHours: parseFloat(row.hours || 0),
        totalCost: parseFloat(row.totalCost || 0),
        hourlyRate: 75.00, // Default rate
        workDescription: row.description
      }))

      // Calculate burn rate (cost per hour over last week)
      const burnRateResult = await client.query(`
        SELECT 
          -- Calculate average cost per hour at $75/hour
          75.00 as "avgCostPerHour",
          COUNT(*) as "weeklyEntries",
          COALESCE(SUM("totalHours" * 75.00), 0) as "weeklyTotal"
        FROM "TimeEntry"
        WHERE "jobId" = $1 
          AND "clockOutTime" IS NOT NULL
          AND "clockOutTime" >= NOW() - INTERVAL '7 days'
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