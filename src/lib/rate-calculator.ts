import { query } from './db'

interface RateCalculation {
  regularRate: number
  overtimeRate: number
  source: 'user' | 'job' | 'skill' | 'default'
}

export class RateCalculator {
  // Default rates by skill level
  private static readonly DEFAULT_RATES = {
    APPRENTICE: 45.00,
    HELPER: 35.00,
    TECH_L1: 55.00,
    TECH_L2: 65.00,
    JOURNEYMAN: 75.00,
    FOREMAN: 85.00,
    MASTER: 95.00,
    OWNER_ADMIN: 100.00
  }

  // Calculate effective rate for a user on a specific job
  static async calculateEffectiveRate(
    userId: string,
    jobId: string,
    date: Date = new Date()
  ): Promise<RateCalculation> {
    try {
      // 1. Check for job-specific rate override
      const jobOverrideResult = await query(`
        SELECT "regularRate", "overtimeRate"
        FROM "JobLaborRateOverride"
        WHERE "jobId" = $1 
          AND "userId" = $2
          AND active = true
          AND "effectiveDate" <= $3
          AND ("expiryDate" IS NULL OR "expiryDate" > $3)
        ORDER BY "effectiveDate" DESC
        LIMIT 1
      `, [jobId, userId, date])

      if (jobOverrideResult.rows.length > 0) {
        const override = jobOverrideResult.rows[0]
        return {
          regularRate: parseFloat(override.regularRate),
          overtimeRate: parseFloat(override.overtimeRate || override.regularRate * 1.5),
          source: 'job'
        }
      }

      // 2. Check for user-specific rate
      const userRateResult = await query(`
        SELECT "regularRate", "overtimeRate", "skillLevel"
        FROM "UserLaborRate"
        WHERE "userId" = $1
          AND active = true
          AND "effectiveDate" <= $2
          AND ("expiryDate" IS NULL OR "expiryDate" > $2)
        ORDER BY "effectiveDate" DESC
        LIMIT 1
      `, [userId, date])

      if (userRateResult.rows.length > 0) {
        const userRate = userRateResult.rows[0]
        return {
          regularRate: parseFloat(userRate.regularRate),
          overtimeRate: parseFloat(userRate.overtimeRate || userRate.regularRate * 1.5),
          source: 'user'
        }
      }

      // 3. Get user's skill level and check skill-based rates
      const userResult = await query(`
        SELECT role, "skillLevel"
        FROM "User"
        WHERE id = $1
      `, [userId])

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0]
        const skillLevel = user.skillLevel || this.mapRoleToSkillLevel(user.role)

        const skillRateResult = await query(`
          SELECT "hourlyRate", "overtimeRate"
          FROM "LaborRate"
          WHERE "skillLevel" = $1
            AND active = true
            AND "effectiveDate" <= $2
            AND ("expiryDate" IS NULL OR "expiryDate" > $2)
          ORDER BY "effectiveDate" DESC
          LIMIT 1
        `, [skillLevel, date])

        if (skillRateResult.rows.length > 0) {
          const skillRate = skillRateResult.rows[0]
          return {
            regularRate: parseFloat(skillRate.hourlyRate),
            overtimeRate: parseFloat(skillRate.overtimeRate || skillRate.hourlyRate * 1.5),
            source: 'skill'
          }
        }

        // 4. Use default rate based on skill level
        const defaultRate = this.DEFAULT_RATES[skillLevel as keyof typeof this.DEFAULT_RATES] || 75.00
        return {
          regularRate: defaultRate,
          overtimeRate: defaultRate * 1.5,
          source: 'default'
        }
      }

      // 5. Fallback to standard journeyman rate
      return {
        regularRate: 75.00,
        overtimeRate: 112.50,
        source: 'default'
      }

    } catch (error) {
      console.error('Error calculating effective rate:', error)
      // Return safe default
      return {
        regularRate: 75.00,
        overtimeRate: 112.50,
        source: 'default'
      }
    }
  }

  // Calculate total cost for hours worked
  static calculateLaborCost(
    hours: number,
    regularRate: number,
    overtimeRate?: number,
    overtimeThreshold: number = 8
  ): {
    regularHours: number
    overtimeHours: number
    regularCost: number
    overtimeCost: number
    totalCost: number
  } {
    const effectiveOvertimeRate = overtimeRate || regularRate * 1.5
    
    if (hours <= overtimeThreshold) {
      return {
        regularHours: hours,
        overtimeHours: 0,
        regularCost: hours * regularRate,
        overtimeCost: 0,
        totalCost: hours * regularRate
      }
    }

    const regularHours = overtimeThreshold
    const overtimeHours = hours - overtimeThreshold
    const regularCost = regularHours * regularRate
    const overtimeCost = overtimeHours * effectiveOvertimeRate

    return {
      regularHours,
      overtimeHours,
      regularCost,
      overtimeCost,
      totalCost: regularCost + overtimeCost
    }
  }

  // Map user role to skill level
  private static mapRoleToSkillLevel(role: string): string {
    const roleToSkillMap: Record<string, string> = {
      'APPRENTICE': 'APPRENTICE',
      'HELPER': 'HELPER',
      'EMPLOYEE': 'JOURNEYMAN',
      'FIELD_CREW': 'JOURNEYMAN',
      'FOREMAN': 'FOREMAN',
      'OWNER_ADMIN': 'MASTER',
      'ADMIN': 'MASTER'
    }
    return roleToSkillMap[role] || 'JOURNEYMAN'
  }

  // Batch calculate rates for multiple entries
  static async batchCalculateRates(
    entries: Array<{ userId: string; jobId: string; date: Date }>
  ): Promise<Map<string, RateCalculation>> {
    const rateMap = new Map<string, RateCalculation>()
    
    // Group by unique user-job combinations
    const uniqueCombos = new Map<string, { userId: string; jobId: string; date: Date }>()
    
    for (const entry of entries) {
      const key = `${entry.userId}-${entry.jobId}`
      if (!uniqueCombos.has(key)) {
        uniqueCombos.set(key, entry)
      }
    }

    // Calculate rates for each unique combination
    await Promise.all(
      Array.from(uniqueCombos.values()).map(async (combo) => {
        const rate = await this.calculateEffectiveRate(
          combo.userId,
          combo.jobId,
          combo.date
        )
        rateMap.set(`${combo.userId}-${combo.jobId}`, rate)
      })
    )

    return rateMap
  }

  // Update time entry with calculated costs
  static async updateTimeEntryCost(timeEntryId: string): Promise<void> {
    const entryResult = await query(`
      SELECT "userId", "jobId", "startTime", "hours"
      FROM "TimeEntry"
      WHERE id = $1
    `, [timeEntryId])

    if (entryResult.rows.length === 0) {
      throw new Error('Time entry not found')
    }

    const entry = entryResult.rows[0]
    const rate = await this.calculateEffectiveRate(
      entry.userId,
      entry.jobId,
      new Date(entry.startTime)
    )

    const cost = this.calculateLaborCost(
      parseFloat(entry.hours),
      rate.regularRate,
      rate.overtimeRate
    )

    await query(`
      UPDATE "TimeEntry"
      SET 
        "regularRate" = $1,
        "overtimeRate" = $2,
        "totalCost" = $3,
        "updatedAt" = NOW()
      WHERE id = $4
    `, [rate.regularRate, rate.overtimeRate, cost.totalCost, timeEntryId])
  }
}