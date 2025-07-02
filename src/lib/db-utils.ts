import { query } from './db'

/**
 * Check if a column exists in a table
 */
export async function columnExists(
  tableName: string,
  columnName: string
): Promise<boolean> {
  try {
    const result = await query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_name = $1 AND column_name = $2`,
      [tableName, columnName]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error(`Error checking column existence: ${tableName}.${columnName}`, error)
    return false
  }
}

/**
 * Check if a table exists
 */
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_name = $1 AND table_schema = 'public'`,
      [tableName]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error(`Error checking table existence: ${tableName}`, error)
    return false
  }
}

/**
 * Get database feature flags
 */
export async function getDbFeatures() {
  const features = {
    hasHoursTracking: await columnExists('JobAssignment', 'hoursWorked'),
    hasOvertimeTracking: await columnExists('JobAssignment', 'overtimeHours'),
    hasCrewDailyHours: await tableExists('CrewDailyHours'),
    hasUserHourlyRates: await columnExists('User', 'hourlyRate'),
  }
  
  return features
}

/**
 * Safe column selection with fallback
 */
export function selectColumn(
  columnName: string,
  fallback: string,
  hasColumn: boolean,
  alias?: string
): string {
  const column = hasColumn ? columnName : fallback
  return alias ? `${column} as ${alias}` : column
}