import { query as dbQuery } from './db'
import { v4 as uuidv4 } from 'uuid'

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'SUBMIT'
  | 'RESUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'DELETE'
  | 'VOID'
  | 'BULK_APPROVE'
  | 'BULK_REJECT'
  | 'PAYROLL_EXPORT'
  | 'LABOR_COST_GENERATED'

export interface AuditEntry {
  entryId: string
  userId: string
  action: AuditAction
  changedBy: string
  changes?: Record<string, { from: any; to: any }>
  notes?: string
  changeReason?: string
  correlationId?: string
  jobLaborCostId?: string
  ipAddress?: string
  userAgent?: string
}

export interface TimeEntrySnapshot {
  id?: string
  hours?: number
  regularHours?: number
  overtimeHours?: number
  doubletimeHours?: number
  totalPay?: number
  jobId?: string
  date?: string
  description?: string
  status?: string
  [key: string]: any
}

export function generateCorrelationId(): string {
  return `bulk_${Date.now()}_${uuidv4().slice(0, 8)}`
}

export function captureChanges(
  oldEntry: TimeEntrySnapshot | null, 
  newEntry: TimeEntrySnapshot
): Record<string, { from: any; to: any }> {
  const changes: Record<string, { from: any; to: any }> = {}
  
  if (!oldEntry) {
    return changes
  }

  const fieldsToTrack = [
    'hours', 'regularHours', 'overtimeHours', 'doubletimeHours',
    'totalPay', 'jobId', 'date', 'description', 'status'
  ]

  for (const field of fieldsToTrack) {
    const oldValue = oldEntry[field]
    const newValue = newEntry[field]
    
    if (oldValue !== newValue && oldValue !== undefined && newValue !== undefined) {
      changes[field] = {
        from: oldValue,
        to: newValue
      }
    }
  }

  return changes
}

export async function createAudit(
  entry: AuditEntry,
  client?: any
): Promise<void> {
  const changes = entry.changes || {}
  
  const oldHours = changes.hours?.from || null
  const newHours = changes.hours?.to || null
  const oldRegular = changes.regularHours?.from || null
  const newRegular = changes.regularHours?.to || null
  const oldOvertime = changes.overtimeHours?.from || null
  const newOvertime = changes.overtimeHours?.to || null
  const oldDoubletime = changes.doubletimeHours?.from || null
  const newDoubletime = changes.doubletimeHours?.to || null
  const oldPay = changes.totalPay?.from || null
  const newPay = changes.totalPay?.to || null
  const oldJobId = changes.jobId?.from || null
  const newJobId = changes.jobId?.to || null
  const oldDate = changes.date?.from || null
  const newDate = changes.date?.to || null
  const oldDescription = changes.description?.from || null
  const newDescription = changes.description?.to || null

  const queryText = `INSERT INTO "TimeEntryAudit" (
    id, entry_id, user_id, action,
    old_hours, new_hours,
    old_regular, new_regular,
    old_overtime, new_overtime,
    old_doubletime, new_doubletime,
    old_pay, new_pay,
    old_job_id, new_job_id,
    old_date, new_date,
    old_description, new_description,
    changed_by, changed_at,
    changes, notes, change_reason,
    correlation_id, job_labor_cost_id,
    ip_address, user_agent
  ) VALUES (
    gen_random_uuid(), $1, $2, $3,
    $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
    $14, $15, $16, $17, $18, $19,
    $20, NOW(),
    $21, $22, $23, $24, $25, $26, $27
  )`

  const params = [
    entry.entryId,
    entry.userId,
    entry.action,
    oldHours, newHours,
    oldRegular, newRegular,
    oldOvertime, newOvertime,
    oldDoubletime, newDoubletime,
    oldPay, newPay,
    oldJobId, newJobId,
    oldDate, newDate,
    oldDescription, newDescription,
    entry.changedBy,
    entry.changes ? JSON.stringify(entry.changes) : null,
    entry.notes,
    entry.changeReason,
    entry.correlationId,
    entry.jobLaborCostId,
    entry.ipAddress,
    entry.userAgent
  ]

  try {
    if (client) {
      await client.query(queryText, params)
    } else {
      await dbQuery(queryText, params)
    }
    console.log(`[AUDIT] Successfully logged ${entry.action} for entry ${entry.entryId}`)
  } catch (error) {
    console.error(`[AUDIT] Failed to log ${entry.action}:`, error)
    throw error
  }
}

export async function createAuditWithTransaction<T>(
  auditEntry: AuditEntry,
  transactionFn: (client: any) => Promise<T>
): Promise<T> {
  const { Pool } = await import('pg')
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    
    const result = await transactionFn(client)
    
    await createAudit(auditEntry, client)
    
    await client.query('COMMIT')
    
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[AUDIT] Transaction failed, rolled back:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

export interface AuditQueryFilters {
  entryId?: string
  userId?: string
  jobId?: string
  action?: AuditAction
  startDate?: string
  endDate?: string
  correlationId?: string
  limit?: number
  offset?: number
}

export async function queryAuditTrail(filters: AuditQueryFilters) {
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  if (filters.entryId) {
    conditions.push(`a.entry_id = $${paramIndex++}`)
    params.push(filters.entryId)
  }

  if (filters.userId) {
    conditions.push(`a.user_id = $${paramIndex++}`)
    params.push(filters.userId)
  }

  if (filters.jobId) {
    conditions.push(`(a.old_job_id = $${paramIndex} OR a.new_job_id = $${paramIndex})`)
    params.push(filters.jobId)
    paramIndex++
  }

  if (filters.action) {
    conditions.push(`a.action = $${paramIndex++}`)
    params.push(filters.action)
  }

  if (filters.startDate) {
    conditions.push(`a.changed_at >= $${paramIndex++}`)
    params.push(filters.startDate)
  }

  if (filters.endDate) {
    conditions.push(`a.changed_at <= $${paramIndex++}`)
    params.push(filters.endDate)
  }

  if (filters.correlationId) {
    conditions.push(`a.correlation_id = $${paramIndex++}`)
    params.push(filters.correlationId)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = filters.limit || 100
  const offset = filters.offset || 0

  const result = await dbQuery(
    `SELECT 
      a.*,
      u.name as "userName",
      cb.name as "changedByName",
      te.status as "currentStatus",
      j.description as "jobDescription"
    FROM "TimeEntryAudit" a
    LEFT JOIN "User" u ON a.user_id = u.id
    LEFT JOIN "User" cb ON a.changed_by = cb.id
    LEFT JOIN "TimeEntry" te ON a.entry_id = te.id
    LEFT JOIN "Job" j ON te."jobId" = j.id
    ${whereClause}
    ORDER BY a.changed_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  )

  return result.rows
}
