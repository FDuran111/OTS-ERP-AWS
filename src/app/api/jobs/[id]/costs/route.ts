import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET job cost details and P&L
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get comprehensive job cost data
    const [
      jobCostResult,
      laborCostsResult,
      materialCostsResult,
      equipmentCostsResult,
      jobDetailsResult
    ] = await Promise.all([
      // Main job cost summary
      query(`
        SELECT * FROM "JobCost" 
        WHERE "jobId" = $1
      `, [params.id]),
      
      // Labor cost breakdown
      query(`
        SELECT 
          jlc.*,
          u.name as "userName",
          lr.name as "rateName"
        FROM "JobLaborCost" jlc
        LEFT JOIN "User" u ON jlc."userId" = u.id
        LEFT JOIN "LaborRate" lr ON jlc."laborRateId" = lr.id
        WHERE jlc."jobId" = $1
        ORDER BY jlc."workDate" DESC, jlc."createdAt" DESC
      `, [params.id]),
      
      // Material cost breakdown
      query(`
        SELECT 
          jmc.*,
          m.code as "materialCode",
          m.name as "materialName",
          m.unit as "materialUnit"
        FROM "JobMaterialCost" jmc
        LEFT JOIN "Material" m ON jmc."materialId" = m.id
        WHERE jmc."jobId" = $1
        ORDER BY jmc."usageDate" DESC, jmc."createdAt" DESC
      `, [params.id]),
      
      // Equipment cost breakdown
      query(`
        SELECT 
          jec.*,
          u.name as "operatorName"
        FROM "JobEquipmentCost" jec
        LEFT JOIN "User" u ON jec."operatorId" = u.id
        WHERE jec."jobId" = $1
        ORDER BY jec."usageDate" DESC, jec."createdAt" DESC
      `, [params.id]),
      
      // Job basic details
      query(`
        SELECT 
          j.id,
          j."jobNumber",
          j.title,
          j.description,
          j.status,
          j."billedAmount",
          j."estimatedValue",
          COALESCE(c."companyName", CONCAT(c."firstName", ' ', c."lastName")) as "customerName"
        FROM "Job" j
        LEFT JOIN "Customer" c ON j."customerId" = c.id
        WHERE j.id = $1
      `, [params.id])
    ])

    const jobDetails = jobDetailsResult.rows[0]
    if (!jobDetails) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    // If no cost record exists, calculate it
    let jobCost = jobCostResult.rows[0]
    if (!jobCost) {
      await query('SELECT calculate_job_costs($1)', [params.id])
      const newCostResult = await query('SELECT * FROM "JobCost" WHERE "jobId" = $1', [params.id])
      jobCost = newCostResult.rows[0]
    }

    // Transform labor costs
    const laborCosts = laborCostsResult.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      userName: row.userName,
      skillLevel: row.skillLevel,
      rateName: row.rateName,
      hourlyRate: parseFloat(row.hourlyRate),
      hoursWorked: parseFloat(row.hoursWorked),
      totalCost: parseFloat(row.totalCost),
      workDate: row.workDate,
      timeEntryId: row.timeEntryId,
      createdAt: row.createdAt
    }))

    // Transform material costs
    const materialCosts = materialCostsResult.rows.map(row => ({
      id: row.id,
      materialId: row.materialId,
      materialCode: row.materialCode,
      materialName: row.materialName,
      materialUnit: row.materialUnit,
      quantityUsed: parseFloat(row.quantityUsed),
      unitCost: parseFloat(row.unitCost),
      totalCost: parseFloat(row.totalCost),
      markup: parseFloat(row.markup || 0),
      markupAmount: parseFloat(row.markupAmount || 0),
      billedAmount: parseFloat(row.billedAmount || 0),
      usageDate: row.usageDate,
      reservationId: row.reservationId,
      createdAt: row.createdAt
    }))

    // Transform equipment costs
    const equipmentCosts = equipmentCostsResult.rows.map(row => ({
      id: row.id,
      equipmentName: row.equipmentName,
      equipmentType: row.equipmentType,
      operatorName: row.operatorName,
      hourlyRate: parseFloat(row.hourlyRate),
      hoursUsed: parseFloat(row.hoursUsed),
      totalCost: parseFloat(row.totalCost),
      usageDate: row.usageDate,
      notes: row.notes,
      createdAt: row.createdAt
    }))

    // Transform main cost summary
    const costSummary = jobCost ? {
      id: jobCost.id,
      jobId: jobCost.jobId,
      totalLaborHours: parseFloat(jobCost.totalLaborHours || 0),
      totalLaborCost: parseFloat(jobCost.totalLaborCost || 0),
      averageLaborRate: parseFloat(jobCost.averageLaborRate || 0),
      totalMaterialCost: parseFloat(jobCost.totalMaterialCost || 0),
      materialMarkup: parseFloat(jobCost.materialMarkup || 0),
      materialMarkupAmount: parseFloat(jobCost.materialMarkupAmount || 0),
      totalEquipmentCost: parseFloat(jobCost.totalEquipmentCost || 0),
      equipmentHours: parseFloat(jobCost.equipmentHours || 0),
      overheadPercentage: parseFloat(jobCost.overheadPercentage || 0),
      overheadAmount: parseFloat(jobCost.overheadAmount || 0),
      miscCosts: parseFloat(jobCost.miscCosts || 0),
      miscCostDescription: jobCost.miscCostDescription,
      totalDirectCosts: parseFloat(jobCost.totalDirectCosts || 0),
      totalIndirectCosts: parseFloat(jobCost.totalIndirectCosts || 0),
      totalJobCost: parseFloat(jobCost.totalJobCost || 0),
      billedAmount: parseFloat(jobCost.billedAmount || 0),
      grossProfit: parseFloat(jobCost.grossProfit || 0),
      grossMargin: parseFloat(jobCost.grossMargin || 0),
      lastCalculated: jobCost.lastCalculated,
      createdAt: jobCost.createdAt,
      updatedAt: jobCost.updatedAt
    } : null

    return NextResponse.json({
      job: {
        id: jobDetails.id,
        jobNumber: jobDetails.jobNumber,
        title: jobDetails.title,
        description: jobDetails.description,
        status: jobDetails.status,
        customerName: jobDetails.customerName,
        billedAmount: parseFloat(jobDetails.billedAmount || 0),
        estimatedValue: parseFloat(jobDetails.estimatedValue || 0)
      },
      costs: costSummary,
      laborCosts,
      materialCosts,
      equipmentCosts
    })

  } catch (error) {
    console.error('Error fetching job costs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job costs' },
      { status: 500 }
    )
  }
}

// PUT update job cost settings (overhead, misc costs, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const {
      overheadPercentage,
      miscCosts,
      miscCostDescription,
      materialMarkup
    } = body

    // Validate inputs
    if (overheadPercentage !== undefined && (overheadPercentage < 0 || overheadPercentage > 100)) {
      return NextResponse.json(
        { error: 'Overhead percentage must be between 0 and 100' },
        { status: 400 }
      )
    }

    if (miscCosts !== undefined && miscCosts < 0) {
      return NextResponse.json(
        { error: 'Miscellaneous costs cannot be negative' },
        { status: 400 }
      )
    }

    // Update job cost settings
    const updateFields = []
    const values = []
    let paramIndex = 1

    if (overheadPercentage !== undefined) {
      updateFields.push(`"overheadPercentage" = $${paramIndex}`)
      values.push(overheadPercentage)
      paramIndex++
    }

    if (miscCosts !== undefined) {
      updateFields.push(`"miscCosts" = $${paramIndex}`)
      values.push(miscCosts)
      paramIndex++
    }

    if (miscCostDescription !== undefined) {
      updateFields.push(`"miscCostDescription" = $${paramIndex}`)
      values.push(miscCostDescription)
      paramIndex++
    }

    if (materialMarkup !== undefined) {
      updateFields.push(`"materialMarkup" = $${paramIndex}`)
      values.push(materialMarkup)
      paramIndex++
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    updateFields.push(`"updatedAt" = NOW()`)
    values.push(params.id)

    // Ensure JobCost record exists
    await query(`
      INSERT INTO "JobCost" ("jobId") 
      VALUES ($1) 
      ON CONFLICT ("jobId") DO NOTHING
    `, [params.id])

    // Update the record
    const updateQuery = `
      UPDATE "JobCost" 
      SET ${updateFields.join(', ')}
      WHERE "jobId" = $${paramIndex}
      RETURNING *
    `

    await query(updateQuery, values)

    // Recalculate costs with new settings
    await query('SELECT calculate_job_costs($1)', [params.id])

    // Return updated costs
    const updatedResult = await query('SELECT * FROM "JobCost" WHERE "jobId" = $1', [params.id])
    const updatedCosts = updatedResult.rows[0]

    return NextResponse.json({
      success: true,
      costs: updatedCosts
    })

  } catch (error) {
    console.error('Error updating job costs:', error)
    return NextResponse.json(
      { error: 'Failed to update job costs' },
      { status: 500 }
    )
  }
}

// POST recalculate job costs
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Recalculate all costs for the job
    await query('SELECT calculate_job_costs($1)', [params.id])

    // Get updated costs
    const result = await query('SELECT * FROM "JobCost" WHERE "jobId" = $1', [params.id])
    const costs = result.rows[0]

    return NextResponse.json({
      success: true,
      message: 'Job costs recalculated successfully',
      costs
    })

  } catch (error) {
    console.error('Error recalculating job costs:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate job costs' },
      { status: 500 }
    )
  }
}