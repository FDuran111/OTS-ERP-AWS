import { useState, useEffect } from 'react'
import { startOfWeek, endOfWeek, format } from 'date-fns'

export interface OvertimeForecast {
  weeklyHours: number
  regularHours: number
  overtimeHours: number
  doubleTimeHours: number
  percentToOvertime: number
  hoursUntilOvertime: number
  estimatedPay: number
  status: 'safe' | 'approaching' | 'overtime' | 'excessive'
}

const OVERTIME_THRESHOLD = 40
const DOUBLE_TIME_THRESHOLD = 60 // 7th day or excessive hours

export function useOvertimeForecast(
  userId: string,
  weekDate: Date = new Date(),
  additionalHours: number = 0
) {
  const [forecast, setForecast] = useState<OvertimeForecast>({
    weeklyHours: 0,
    regularHours: 0,
    overtimeHours: 0,
    doubleTimeHours: 0,
    percentToOvertime: 0,
    hoursUntilOvertime: OVERTIME_THRESHOLD,
    estimatedPay: 0,
    status: 'safe',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWeeklyHours = async () => {
      try {
        setLoading(true)
        setError(null)

        const weekStart = startOfWeek(weekDate, { weekStartsOn: 0 })
        const weekParam = format(weekStart, 'yyyy-MM-dd')

        const response = await fetch(
          `/api/time-entries/weekly-summary?week=${weekParam}&userId=${userId}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch weekly hours')
        }

        const data = await response.json()

        const totalHours = parseFloat(data.totalHours || 0) + additionalHours
        const regularHours = Math.min(totalHours, OVERTIME_THRESHOLD)
        const overtimeHours = Math.max(
          0,
          Math.min(totalHours - OVERTIME_THRESHOLD, DOUBLE_TIME_THRESHOLD - OVERTIME_THRESHOLD)
        )
        const doubleTimeHours = Math.max(0, totalHours - DOUBLE_TIME_THRESHOLD)

        const hoursUntilOvertime = Math.max(0, OVERTIME_THRESHOLD - totalHours)
        const percentToOvertime = Math.min(100, (totalHours / OVERTIME_THRESHOLD) * 100)

        let status: OvertimeForecast['status'] = 'safe'
        if (totalHours >= DOUBLE_TIME_THRESHOLD) {
          status = 'excessive'
        } else if (totalHours >= OVERTIME_THRESHOLD) {
          status = 'overtime'
        } else if (totalHours >= OVERTIME_THRESHOLD * 0.9) {
          status = 'approaching'
        }

        const avgRate = 25
        const overtimeRate = avgRate * 1.5
        const doubleTimeRate = avgRate * 2

        const estimatedPay =
          regularHours * avgRate +
          overtimeHours * overtimeRate +
          doubleTimeHours * doubleTimeRate

        setForecast({
          weeklyHours: totalHours,
          regularHours,
          overtimeHours,
          doubleTimeHours,
          percentToOvertime,
          hoursUntilOvertime,
          estimatedPay,
          status,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to calculate forecast')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchWeeklyHours()
    }
  }, [userId, weekDate, additionalHours])

  return { forecast, loading, error }
}
