import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { query } from '@/lib/db'
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userPayload = verifyToken(token)
    const userId = userPayload.id

    const searchParams = request.nextUrl.searchParams
    const weekParam = searchParams.get('week')
    const employeeId = searchParams.get('userId') || userId

    if (!weekParam) {
      return NextResponse.json(
        { error: 'Week parameter is required (YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const weekDate = parseISO(weekParam)
    const weekStart = startOfWeek(weekDate, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(weekDate, { weekStartsOn: 0 })

    const result = await query(
      `SELECT
        te.id,
        te.date,
        te."startTime",
        te."endTime",
        te.hours as "totalHours",
        te."regularHours",
        te."overtimeHours",
        te."doubleTimeHours",
        te."categoryHours",
        te."estimatedPay" as "totalPay",
        te.status,
        te."jobId",
        te.description as "workDescription",
        te."photoCount",
        te."hasRejectionNotes",
        j."jobNumber",
        j.description as "jobTitle",
        te.date as "workDate"
      FROM "TimeEntry" te
      LEFT JOIN "Job" j ON te."jobId" = j.id
      WHERE te."userId" = $1
        AND te.date >= $2
        AND te.date <= $3
        AND te.status != 'DELETED'
      ORDER BY te.date ASC, te."startTime" ASC`,
      [employeeId, format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd')]
    )

    const entries = result.rows

    const summary = {
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      totalEntries: entries.length,
      regularHours: 0,
      overtimeHours: 0,
      doubleTimeHours: 0,
      totalHours: 0,
      totalPay: 0,
      categoryBreakdown: {
        STRAIGHT_TIME: 0,
        STRAIGHT_TIME_TRAVEL: 0,
        OVERTIME: 0,
        OVERTIME_TRAVEL: 0,
        DOUBLE_TIME: 0,
        DOUBLE_TIME_TRAVEL: 0,
      },
      status: 'DRAFT' as 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PARTIAL',
      breakdown: [] as any[],
      hasRejections: false,
      hasPhotos: false,
    }

    const dailyBreakdown = new Map<string, any>()
    let hasSubmitted = false
    let hasApproved = false
    let hasDraft = false
    let hasRejected = false

    entries.forEach(entry => {
      const regularHours = parseFloat(entry.regularHours || 0)
      const overtimeHours = parseFloat(entry.overtimeHours || 0)
      const doubleTimeHours = parseFloat(entry.doubleTimeHours || 0)
      const totalHours = parseFloat(entry.totalHours || 0)
      const totalPay = parseFloat(entry.totalPay || 0)

      summary.regularHours += regularHours
      summary.overtimeHours += overtimeHours
      summary.doubleTimeHours += doubleTimeHours
      summary.totalHours += totalHours
      summary.totalPay += totalPay

      // Add category hours if available
      if (entry.categoryHours && typeof entry.categoryHours === 'object') {
        const categories = entry.categoryHours
        summary.categoryBreakdown.STRAIGHT_TIME += parseFloat(categories.STRAIGHT_TIME || 0)
        summary.categoryBreakdown.STRAIGHT_TIME_TRAVEL += parseFloat(categories.STRAIGHT_TIME_TRAVEL || 0)
        summary.categoryBreakdown.OVERTIME += parseFloat(categories.OVERTIME || 0)
        summary.categoryBreakdown.OVERTIME_TRAVEL += parseFloat(categories.OVERTIME_TRAVEL || 0)
        summary.categoryBreakdown.DOUBLE_TIME += parseFloat(categories.DOUBLE_TIME || 0)
        summary.categoryBreakdown.DOUBLE_TIME_TRAVEL += parseFloat(categories.DOUBLE_TIME_TRAVEL || 0)
      }

      if (entry.status === 'SUBMITTED') hasSubmitted = true
      if (entry.status === 'APPROVED') hasApproved = true
      if (entry.status === 'ACTIVE' || entry.status === 'DRAFT') hasDraft = true
      if (entry.status === 'REJECTED') hasRejected = true
      if (entry.hasRejectionNotes) summary.hasRejections = true
      if (entry.photoCount > 0) summary.hasPhotos = true

      const dateKey = entry.workDate
      if (!dailyBreakdown.has(dateKey)) {
        dailyBreakdown.set(dateKey, {
          date: dateKey,
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          doubleTimeHours: 0,
          entries: [],
          status: entry.status,
        })
      }

      const dayData = dailyBreakdown.get(dateKey)
      dayData.totalHours += totalHours
      dayData.regularHours += regularHours
      dayData.overtimeHours += overtimeHours
      dayData.doubleTimeHours += doubleTimeHours
      dayData.entries.push({
        id: entry.id,
        jobNumber: entry.jobNumber,
        jobTitle: entry.jobTitle,
        hours: totalHours,
        status: entry.status,
        hasPhotos: entry.photoCount > 0,
        hasNotes: entry.hasRejectionNotes,
      })

      if (entry.status === 'REJECTED') {
        dayData.status = 'REJECTED'
      } else if (dayData.status !== 'REJECTED' && entry.status === 'SUBMITTED') {
        dayData.status = 'SUBMITTED'
      } else if (dayData.status !== 'REJECTED' && dayData.status !== 'SUBMITTED' && entry.status === 'APPROVED') {
        dayData.status = 'APPROVED'
      }
    })

    summary.breakdown = Array.from(dailyBreakdown.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    )

    if (hasRejected) {
      summary.status = 'REJECTED'
    } else if (hasApproved && hasDraft) {
      summary.status = 'PARTIAL'
    } else if (hasApproved && !hasDraft) {
      summary.status = 'APPROVED'
    } else if (hasSubmitted) {
      summary.status = 'SUBMITTED'
    } else {
      summary.status = 'DRAFT'
    }

    summary.regularHours = Math.round(summary.regularHours * 100) / 100
    summary.overtimeHours = Math.round(summary.overtimeHours * 100) / 100
    summary.doubleTimeHours = Math.round(summary.doubleTimeHours * 100) / 100
    summary.totalHours = Math.round(summary.totalHours * 100) / 100
    summary.totalPay = Math.round(summary.totalPay * 100) / 100

    // Round category breakdown values
    summary.categoryBreakdown.STRAIGHT_TIME = Math.round(summary.categoryBreakdown.STRAIGHT_TIME * 100) / 100
    summary.categoryBreakdown.STRAIGHT_TIME_TRAVEL = Math.round(summary.categoryBreakdown.STRAIGHT_TIME_TRAVEL * 100) / 100
    summary.categoryBreakdown.OVERTIME = Math.round(summary.categoryBreakdown.OVERTIME * 100) / 100
    summary.categoryBreakdown.OVERTIME_TRAVEL = Math.round(summary.categoryBreakdown.OVERTIME_TRAVEL * 100) / 100
    summary.categoryBreakdown.DOUBLE_TIME = Math.round(summary.categoryBreakdown.DOUBLE_TIME * 100) / 100
    summary.categoryBreakdown.DOUBLE_TIME_TRAVEL = Math.round(summary.categoryBreakdown.DOUBLE_TIME_TRAVEL * 100) / 100

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching weekly summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch weekly summary' },
      { status: 500 }
    )
  }
}
