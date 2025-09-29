import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET - Fetch current overtime settings
export async function GET(request: NextRequest) {
  try {
    // Get the settings (should only be one per company for now)
    const result = await query(`
      SELECT
        id,
        "companyId",
        "dailyOTThreshold",
        "weeklyOTThreshold",
        "dailyDTThreshold",
        "weeklyDTThreshold",
        "otMultiplier",
        "dtMultiplier",
        "seventhDayOT",
        "seventhDayDT",
        "useDailyOT",
        "useWeeklyOT",
        "roundingInterval",
        "roundingType",
        "breakRules",
        "createdAt",
        "updatedAt"
      FROM "OvertimeSettings"
      WHERE "companyId" = $1
      LIMIT 1
    `, ['00000000-0000-0000-0000-000000000001'])

    if (result.rows.length === 0) {
      // Return default settings if none exist
      return NextResponse.json({
        dailyOTThreshold: 8,
        weeklyOTThreshold: 40,
        dailyDTThreshold: 12,
        weeklyDTThreshold: 60,
        otMultiplier: 1.5,
        dtMultiplier: 2.0,
        seventhDayOT: true,
        seventhDayDT: true,
        useDailyOT: false,
        useWeeklyOT: true,
        roundingInterval: 15,
        roundingType: 'nearest',
        breakRules: { autoDeduct: false, rules: [] }
      })
    }

    const settings = result.rows[0]

    // Convert string decimals to numbers
    return NextResponse.json({
      ...settings,
      dailyOTThreshold: parseFloat(settings.dailyOTThreshold),
      weeklyOTThreshold: parseFloat(settings.weeklyOTThreshold),
      dailyDTThreshold: parseFloat(settings.dailyDTThreshold),
      weeklyDTThreshold: parseFloat(settings.weeklyDTThreshold),
      otMultiplier: parseFloat(settings.otMultiplier),
      dtMultiplier: parseFloat(settings.dtMultiplier),
      roundingInterval: parseInt(settings.roundingInterval)
    })
  } catch (error: any) {
    // Check if table doesn't exist
    if (error?.code === '42P01') {
      // Return default settings
      return NextResponse.json({
        dailyOTThreshold: 8,
        weeklyOTThreshold: 40,
        dailyDTThreshold: 12,
        weeklyDTThreshold: 60,
        otMultiplier: 1.5,
        dtMultiplier: 2.0,
        seventhDayOT: true,
        seventhDayDT: true,
        useDailyOT: false,
        useWeeklyOT: true,
        roundingInterval: 15,
        roundingType: 'nearest',
        breakRules: { autoDeduct: false, rules: [] }
      })
    }

    console.error('Error fetching overtime settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch overtime settings' },
      { status: 500 }
    )
  }
}

// POST/PATCH - Update overtime settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const {
      dailyOTThreshold = 8,
      weeklyOTThreshold = 40,
      dailyDTThreshold = 12,
      weeklyDTThreshold = 60,
      otMultiplier = 1.5,
      dtMultiplier = 2.0,
      seventhDayOT = true,
      seventhDayDT = true,
      useDailyOT = false,
      useWeeklyOT = true,
      roundingInterval = 15,
      roundingType = 'nearest',
      breakRules = { autoDeduct: false, rules: [] }
    } = body

    // Check if settings exist
    const existing = await query(`
      SELECT id FROM "OvertimeSettings"
      WHERE "companyId" = $1
      LIMIT 1
    `, ['00000000-0000-0000-0000-000000000001'])

    if (existing.rows.length > 0) {
      // Update existing settings
      const result = await query(`
        UPDATE "OvertimeSettings"
        SET
          "dailyOTThreshold" = $2,
          "weeklyOTThreshold" = $3,
          "dailyDTThreshold" = $4,
          "weeklyDTThreshold" = $5,
          "otMultiplier" = $6,
          "dtMultiplier" = $7,
          "seventhDayOT" = $8,
          "seventhDayDT" = $9,
          "useDailyOT" = $10,
          "useWeeklyOT" = $11,
          "roundingInterval" = $12,
          "roundingType" = $13,
          "breakRules" = $14,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "companyId" = $1
        RETURNING *
      `, [
        '00000000-0000-0000-0000-000000000001',
        dailyOTThreshold,
        weeklyOTThreshold,
        dailyDTThreshold,
        weeklyDTThreshold,
        otMultiplier,
        dtMultiplier,
        seventhDayOT,
        seventhDayDT,
        useDailyOT,
        useWeeklyOT,
        roundingInterval,
        roundingType,
        JSON.stringify(breakRules)
      ])

      return NextResponse.json(result.rows[0])
    } else {
      // Insert new settings
      const result = await query(`
        INSERT INTO "OvertimeSettings" (
          "companyId",
          "dailyOTThreshold",
          "weeklyOTThreshold",
          "dailyDTThreshold",
          "weeklyDTThreshold",
          "otMultiplier",
          "dtMultiplier",
          "seventhDayOT",
          "seventhDayDT",
          "useDailyOT",
          "useWeeklyOT",
          "roundingInterval",
          "roundingType",
          "breakRules"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `, [
        '00000000-0000-0000-0000-000000000001',
        dailyOTThreshold,
        weeklyOTThreshold,
        dailyDTThreshold,
        weeklyDTThreshold,
        otMultiplier,
        dtMultiplier,
        seventhDayOT,
        seventhDayDT,
        useDailyOT,
        useWeeklyOT,
        roundingInterval,
        roundingType,
        JSON.stringify(breakRules)
      ])

      return NextResponse.json(result.rows[0], { status: 201 })
    }
  } catch (error) {
    console.error('Error updating overtime settings:', error)
    return NextResponse.json(
      { error: 'Failed to update overtime settings' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  return POST(request)
}