import { startOfWeek, endOfWeek, differenceInDays, format, parseISO } from 'date-fns'

export interface OvertimeSettings {
  dailyOTThreshold: number
  weeklyOTThreshold: number
  dailyDTThreshold: number
  weeklyDTThreshold: number
  otMultiplier: number
  dtMultiplier: number
  seventhDayOT: boolean
  seventhDayDT: boolean
  useDailyOT: boolean
  useWeeklyOT: boolean
  roundingInterval: number
  roundingType: 'nearest' | 'up' | 'down'
}

export interface TimeEntry {
  date: string
  hours: number
  userId: string
  regularHours?: number
  overtimeHours?: number
  doubleTimeHours?: number
}

export interface CalculatedHours {
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  totalHours: number
  consecutiveDay: number
  isSeventhDay: boolean
}

export interface WeeklyCalculation {
  entries: Map<string, CalculatedHours>
  weeklyRegular: number
  weeklyOvertime: number
  weeklyDoubleTime: number
  weeklyTotal: number
}

/**
 * Round time based on interval and type
 */
export function roundTime(hours: number, interval: number, type: 'nearest' | 'up' | 'down'): number {
  if (interval === 0) return hours

  const intervalHours = interval / 60 // Convert minutes to hours

  switch (type) {
    case 'up':
      return Math.ceil(hours / intervalHours) * intervalHours
    case 'down':
      return Math.floor(hours / intervalHours) * intervalHours
    case 'nearest':
    default:
      return Math.round(hours / intervalHours) * intervalHours
  }
}

/**
 * Calculate consecutive work days for 7th day rule
 */
export function getConsecutiveWorkDays(
  entries: TimeEntry[],
  currentDate: string,
  userId: string
): number {
  // Sort entries by date - ensure dates are strings
  const sorted = entries
    .filter(e => e.userId === userId && e.date <= currentDate)
    .sort((a, b) => {
      const dateA = String(a.date)
      const dateB = String(b.date)
      return dateA.localeCompare(dateB)
    })

  if (sorted.length === 0) return 1

  let consecutive = 1
  const current = parseISO(currentDate)

  // Work backwards from current date
  for (let i = sorted.length - 1; i >= 0; i--) {
    const entryDate = parseISO(sorted[i].date)
    const daysDiff = differenceInDays(current, entryDate)

    // If there's a gap, break the chain
    if (daysDiff > consecutive) break

    if (daysDiff === consecutive) {
      consecutive++
    }
  }

  return consecutive
}

/**
 * Calculate hours breakdown for a single day
 */
export function calculateDailyHours(
  totalHours: number,
  settings: OvertimeSettings,
  isSeventhDay: boolean = false
): CalculatedHours {
  let regularHours = 0
  let overtimeHours = 0
  let doubleTimeHours = 0

  // Apply rounding first
  const roundedHours = roundTime(totalHours, settings.roundingInterval, settings.roundingType)

  if (isSeventhDay && settings.seventhDayOT) {
    // 7th consecutive day - special California rules
    if (roundedHours <= 8) {
      // First 8 hours are OT
      overtimeHours = roundedHours
    } else if (settings.seventhDayDT) {
      // First 8 are OT, rest is DT
      overtimeHours = 8
      doubleTimeHours = roundedHours - 8
    } else {
      // All OT if no DT rule
      overtimeHours = roundedHours
    }
  } else if (settings.useDailyOT) {
    // Apply daily OT rules only if enabled
    if (roundedHours <= settings.dailyOTThreshold) {
      regularHours = roundedHours
    } else if (roundedHours <= settings.dailyDTThreshold) {
      regularHours = settings.dailyOTThreshold
      overtimeHours = roundedHours - settings.dailyOTThreshold
    } else {
      regularHours = settings.dailyOTThreshold
      overtimeHours = settings.dailyDTThreshold - settings.dailyOTThreshold
      doubleTimeHours = roundedHours - settings.dailyDTThreshold
    }
  } else {
    // No daily OT rules - all hours are regular for daily calculation
    // Weekly rules will be applied in calculateWeeklyHours
    regularHours = roundedHours
  }

  return {
    regularHours,
    overtimeHours,
    doubleTimeHours,
    totalHours: roundedHours,
    consecutiveDay: 0,
    isSeventhDay
  }
}

/**
 * Calculate weekly overtime adjustments
 */
export function calculateWeeklyHours(
  entries: TimeEntry[],
  settings: OvertimeSettings
): WeeklyCalculation {
  const result: WeeklyCalculation = {
    entries: new Map(),
    weeklyRegular: 0,
    weeklyOvertime: 0,
    weeklyDoubleTime: 0,
    weeklyTotal: 0
  }

  // Sort by date for proper calculation
  // Ensure dates are strings for comparison
  const sorted = [...entries].sort((a, b) => {
    const dateA = String(a.date)
    const dateB = String(b.date)
    return dateA.localeCompare(dateB)
  })

  let weeklyAccumulator = 0

  for (const entry of sorted) {
    const consecutiveDay = getConsecutiveWorkDays(sorted, entry.date, entry.userId)
    const isSeventhDay = consecutiveDay >= 7

    // Calculate daily breakdown first
    const dailyCalc = calculateDailyHours(entry.hours, settings, isSeventhDay)
    dailyCalc.consecutiveDay = consecutiveDay

    // Apply weekly thresholds
    let adjustedRegular = dailyCalc.regularHours
    let adjustedOvertime = dailyCalc.overtimeHours
    let adjustedDoubleTime = dailyCalc.doubleTimeHours

    // Check if we've exceeded weekly thresholds (only if weekly OT is enabled)
    if (settings.useWeeklyOT && !isSeventhDay) { // Don't apply weekly rules on 7th day (already all OT/DT)
      const prevTotal = weeklyAccumulator
      const newTotal = prevTotal + dailyCalc.totalHours

      if (prevTotal < settings.weeklyOTThreshold && newTotal > settings.weeklyOTThreshold) {
        // Crossing into weekly OT
        const regularPortion = Math.max(0, settings.weeklyOTThreshold - prevTotal)
        const otPortion = Math.min(
          dailyCalc.regularHours - regularPortion,
          settings.weeklyDTThreshold - settings.weeklyOTThreshold
        )

        adjustedRegular = Math.min(dailyCalc.regularHours, regularPortion)
        adjustedOvertime += dailyCalc.regularHours - adjustedRegular
      } else if (prevTotal >= settings.weeklyOTThreshold && prevTotal < settings.weeklyDTThreshold) {
        // Already in weekly OT
        if (newTotal > settings.weeklyDTThreshold) {
          // Crossing into weekly DT
          const otPortion = Math.max(0, settings.weeklyDTThreshold - prevTotal)
          const dtPortion = dailyCalc.regularHours - otPortion

          adjustedRegular = 0
          adjustedOvertime += otPortion
          adjustedDoubleTime += dtPortion
        } else {
          // All regular becomes OT
          adjustedOvertime += adjustedRegular
          adjustedRegular = 0
        }
      } else if (prevTotal >= settings.weeklyDTThreshold) {
        // Already in weekly DT - all regular becomes DT
        adjustedDoubleTime += adjustedRegular + adjustedOvertime
        adjustedRegular = 0
        adjustedOvertime = 0
      }
    }

    weeklyAccumulator += dailyCalc.totalHours

    // Store calculated values
    const finalCalc: CalculatedHours = {
      regularHours: adjustedRegular,
      overtimeHours: adjustedOvertime,
      doubleTimeHours: adjustedDoubleTime,
      totalHours: dailyCalc.totalHours,
      consecutiveDay,
      isSeventhDay
    }

    result.entries.set(entry.date, finalCalc)
    result.weeklyRegular += adjustedRegular
    result.weeklyOvertime += adjustedOvertime
    result.weeklyDoubleTime += adjustedDoubleTime
  }

  result.weeklyTotal = result.weeklyRegular + result.weeklyOvertime + result.weeklyDoubleTime

  return result
}

/**
 * Calculate estimated pay based on rates
 */
export function calculatePay(
  hours: CalculatedHours,
  regularRate: number,
  overtimeRate?: number,
  doubleTimeRate?: number
): number {
  const otRate = overtimeRate || (regularRate * 1.5)
  const dtRate = doubleTimeRate || (regularRate * 2)

  return (
    (hours.regularHours * regularRate) +
    (hours.overtimeHours * otRate) +
    (hours.doubleTimeHours * dtRate)
  )
}

/**
 * Format hours for display
 */
export function formatHours(hours: number): string {
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)

  if (minutes === 0) {
    return `${wholeHours}h`
  } else {
    return `${wholeHours}h ${minutes}m`
  }
}

/**
 * Get week date range for display
 */
export function getWeekDateRange(date: Date): { start: Date; end: Date; weekNumber: number } {
  const start = startOfWeek(date, { weekStartsOn: 1 }) // Monday
  const end = endOfWeek(date, { weekStartsOn: 1 }) // Sunday
  const weekNumber = parseInt(format(date, 'w'))

  return { start, end, weekNumber }
}