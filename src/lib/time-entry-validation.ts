import { query } from './db'
import { startOfWeek, endOfWeek } from 'date-fns'

export interface ValidationWarning {
  type: 'OVERTIME' | 'LONG_DAY' | 'MISSING_BREAK' | 'EXCESSIVE_HOURS'
  severity: 'warning' | 'error' | 'info'
  message: string
  details?: any
}

export interface ValidationResult {
  isValid: boolean
  warnings: ValidationWarning[]
  weeklyHours: number
  overtimeHours: number
}

export async function validateTimeEntry(
  userId: string,
  entryDate: Date,
  hours: number,
  hasBreaks: boolean = false
): Promise<ValidationResult> {
  const warnings: ValidationWarning[] = []

  const weekStart = startOfWeek(entryDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(entryDate, { weekStartsOn: 0 })

  const result = await query(
    `SELECT 
      COALESCE(SUM("totalHours"), 0) as "weeklyHours",
      COALESCE(SUM("overtimeHours"), 0) as "existingOvertime"
    FROM "TimeEntry"
    WHERE "userId" = $1
      AND "clockInTime" >= $2
      AND "clockInTime" <= $3
      AND status != 'DELETED'
      AND DATE("clockInTime") != $4`,
    [userId, weekStart.toISOString(), weekEnd.toISOString(), entryDate.toISOString().split('T')[0]]
  )

  const weeklyHours = parseFloat(result.rows[0]?.weeklyHours || 0) + hours
  const overtimeThreshold = 40
  const overtimeHours = Math.max(0, weeklyHours - overtimeThreshold)

  if (hours > 12) {
    warnings.push({
      type: 'LONG_DAY',
      severity: 'warning',
      message: `You're recording ${hours} hours for this day. Please confirm this is correct.`,
      details: { hours, date: entryDate },
    })
  }

  if (hours > 16) {
    warnings.push({
      type: 'EXCESSIVE_HOURS',
      severity: 'error',
      message: `${hours} hours in a single day exceeds reasonable limits. Please verify your entry.`,
      details: { hours, date: entryDate },
    })
  }

  if (weeklyHours > overtimeThreshold) {
    const newOvertimeHours = overtimeHours - parseFloat(result.rows[0]?.existingOvertime || 0)
    warnings.push({
      type: 'OVERTIME',
      severity: 'info',
      message: `This entry brings your weekly total to ${weeklyHours.toFixed(1)} hours (${overtimeHours.toFixed(1)} hours overtime).`,
      details: {
        weeklyHours,
        overtimeHours,
        newOvertimeHours,
      },
    })
  }

  if (hours > 6 && !hasBreaks) {
    warnings.push({
      type: 'MISSING_BREAK',
      severity: 'warning',
      message: `You worked ${hours} hours without recording a break. Did you take a lunch break?`,
      details: { hours },
    })
  }

  return {
    isValid: warnings.filter(w => w.severity === 'error').length === 0,
    warnings,
    weeklyHours,
    overtimeHours,
  }
}

export async function validateWeeklySubmission(
  userId: string,
  weekDate: Date
): Promise<ValidationResult> {
  const warnings: ValidationWarning[] = []

  const weekStart = startOfWeek(weekDate, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 0 })

  const result = await query(
    `SELECT 
      te.id,
      te."clockInTime",
      te."totalHours",
      te."breakMinutes",
      DATE(te."clockInTime") as "workDate",
      COALESCE(SUM(teb."durationMinutes"), 0) as "breakMinutes"
    FROM "TimeEntry" te
    LEFT JOIN "TimeEntryBreak" teb ON te.id = teb."timeEntryId"
    WHERE te."userId" = $1
      AND te."clockInTime" >= $2
      AND te."clockInTime" <= $3
      AND te.status IN ('ACTIVE', 'DRAFT')
    GROUP BY te.id, te."clockInTime", te."totalHours", te."breakMinutes"
    ORDER BY te."clockInTime"`,
    [userId, weekStart.toISOString(), weekEnd.toISOString()]
  )

  let weeklyHours = 0
  const dailyHours = new Map<string, number>()

  result.rows.forEach(row => {
    const hours = parseFloat(row.totalHours || 0)
    weeklyHours += hours

    const dateKey = row.workDate
    dailyHours.set(dateKey, (dailyHours.get(dateKey) || 0) + hours)

    if (hours > 6 && parseFloat(row.breakMinutes || 0) === 0) {
      warnings.push({
        type: 'MISSING_BREAK',
        severity: 'warning',
        message: `Missing break for ${hours} hour shift on ${dateKey}. Consider adding a lunch break.`,
        details: { date: dateKey, hours },
      })
    }
  })

  dailyHours.forEach((hours, date) => {
    if (hours > 12) {
      warnings.push({
        type: 'LONG_DAY',
        severity: 'warning',
        message: `${hours} hours recorded on ${date}. Please confirm this is accurate.`,
        details: { date, hours },
      })
    }
  })

  const overtimeThreshold = 40
  const overtimeHours = Math.max(0, weeklyHours - overtimeThreshold)

  if (overtimeHours > 0) {
    warnings.push({
      type: 'OVERTIME',
      severity: 'info',
      message: `Week total: ${weeklyHours.toFixed(1)} hours includes ${overtimeHours.toFixed(1)} hours of overtime.`,
      details: { weeklyHours, overtimeHours },
    })
  }

  return {
    isValid: warnings.filter(w => w.severity === 'error').length === 0,
    warnings,
    weeklyHours,
    overtimeHours,
  }
}
