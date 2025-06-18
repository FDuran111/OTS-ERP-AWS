import { query } from './db'

export interface SearchOptions {
  q?: string // Search query
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, any>
}

export interface SearchResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Generic search function for database queries
 */
export async function search<T>(
  baseQuery: string,
  searchFields: string[],
  options: SearchOptions = {},
  countQuery?: string
): Promise<SearchResult<T>> {
  const {
    q = '',
    page = 1,
    limit = 20,
    sortBy = 'created_at',
    sortOrder = 'desc',
    filters = {}
  } = options

  // Build WHERE conditions
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  // Add search conditions
  if (q && searchFields.length > 0) {
    const searchConditions = searchFields.map(field => 
      `${field} ILIKE $${paramIndex}`
    ).join(' OR ')
    conditions.push(`(${searchConditions})`)
    params.push(`%${q}%`)
    paramIndex++
  }

  // Add filter conditions
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        // Handle array filters (e.g., status IN ('ACTIVE', 'PENDING'))
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ')
        conditions.push(`${key} IN (${placeholders})`)
        params.push(...value)
      } else if (typeof value === 'object' && value.operator) {
        // Handle complex filters (e.g., { operator: 'gte', value: 100 })
        const operator = value.operator === 'gte' ? '>=' :
                        value.operator === 'lte' ? '<=' :
                        value.operator === 'gt' ? '>' :
                        value.operator === 'lt' ? '<' :
                        value.operator === 'ne' ? '!=' : '='
        conditions.push(`${key} ${operator} $${paramIndex++}`)
        params.push(value.value)
      } else {
        // Handle simple equality filters
        conditions.push(`${key} = $${paramIndex++}`)
        params.push(value)
      }
    }
  })

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // Build ORDER BY clause
  const allowedSortFields = [
    'createdAt', 'updatedAt', 'name', 'title', 'status', 'date',
    'c."createdAt"', 'c."updatedAt"', 'j."createdAt"', 'j."updatedAt"',
    'l."updatedAt"', 'i."createdAt"', 'm.name'
  ]
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'
  const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC'
  const orderClause = `ORDER BY ${safeSortBy} ${safeSortOrder}`

  // Build pagination
  const offset = (page - 1) * limit
  const limitClause = `LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
  params.push(limit, offset)

  // Execute main query
  const mainQuery = `${baseQuery} ${whereClause} ${orderClause} ${limitClause}`
  const result = await query(mainQuery, params)

  // Execute count query for pagination
  let total = 0
  if (countQuery || baseQuery.includes('SELECT')) {
    const countQueryText = countQuery || baseQuery.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM')
    const countParams = params.slice(0, params.length - 2) // Remove LIMIT and OFFSET params
    const countResult = await query(`${countQueryText} ${whereClause}`, countParams)
    total = parseInt(countResult.rows[0]?.total || 0)
  }

  const totalPages = Math.ceil(total / limit)

  return {
    data: result.rows as T[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
}

/**
 * Search customers with advanced filtering
 */
export async function searchCustomers(options: SearchOptions = {}) {
  const baseQuery = `
    SELECT 
      c.*,
      COUNT(j.id) as total_jobs,
      COUNT(CASE WHEN j.status IN ('SCHEDULED', 'DISPATCHED', 'IN_PROGRESS') THEN 1 END) as active_jobs
    FROM "Customer" c
    LEFT JOIN "Job" j ON c.id = j."customerId"
    GROUP BY c.id
  `
  
  const searchFields = [
    'c."firstName"',
    'c."lastName"', 
    'c."companyName"',
    'c.email',
    'c.phone'
  ]

  return search(baseQuery, searchFields, {
    ...options,
    sortBy: options.sortBy || 'c."createdAt"'
  })
}

/**
 * Search jobs with advanced filtering
 */
export async function searchJobs(options: SearchOptions = {}) {
  const baseQuery = `
    SELECT 
      j.*,
      c."companyName",
      c."firstName",
      c."lastName",
      COALESCE(SUM(te.hours), 0) as total_hours
    FROM "Job" j
    INNER JOIN "Customer" c ON j."customerId" = c.id
    LEFT JOIN "TimeEntry" te ON j.id = te."jobId"
    GROUP BY j.id, c.id
  `
  
  const searchFields = [
    'j."jobNumber"',
    'j.description',
    'c."companyName"',
    'c."firstName"',
    'c."lastName"'
  ]

  return search(baseQuery, searchFields, {
    ...options,
    sortBy: options.sortBy || 'j."createdAt"'
  })
}

/**
 * Search materials with inventory filtering
 */
export async function searchMaterials(options: SearchOptions = {}) {
  const baseQuery = `
    SELECT 
      m.*,
      v.name as vendor_name,
      v.code as vendor_code
    FROM "Material" m
    LEFT JOIN "Vendor" v ON m."vendorId" = v.id
    WHERE m.active = true
  `
  
  const searchFields = [
    'm.code',
    'm.name',
    'm.description',
    'm.manufacturer'
  ]

  return search(baseQuery, searchFields, {
    ...options,
    sortBy: options.sortBy || 'm.name'
  })
}

/**
 * Search leads with pipeline filtering
 */
export async function searchLeads(options: SearchOptions = {}) {
  const baseQuery = `
    SELECT 
      l.*,
      u.name as assigned_user_name
    FROM "Lead" l
    LEFT JOIN "User" u ON l."assignedTo" = u.id
  `
  
  const searchFields = [
    'l."firstName"',
    'l."lastName"',
    'l."companyName"',
    'l.email',
    'l.phone',
    'l.description'
  ]

  return search(baseQuery, searchFields, {
    ...options,
    sortBy: options.sortBy || 'l."updatedAt"'
  })
}

/**
 * Search invoices with payment status filtering
 */
export async function searchInvoices(options: SearchOptions = {}) {
  const baseQuery = `
    SELECT 
      i.*,
      j."jobNumber",
      j.description as job_description,
      c."firstName",
      c."lastName",
      c."companyName"
    FROM "Invoice" i
    INNER JOIN "Job" j ON i."jobId" = j.id
    INNER JOIN "Customer" c ON i."customerId" = c.id
  `
  
  const searchFields = [
    'i."invoiceNumber"',
    'j."jobNumber"',
    'j.description',
    'c."companyName"',
    'c."firstName"',
    'c."lastName"'
  ]

  return search(baseQuery, searchFields, {
    ...options,
    sortBy: options.sortBy || 'i."createdAt"'
  })
}

/**
 * Get search suggestions based on query
 */
export async function getSearchSuggestions(
  table: string,
  field: string,
  query: string,
  limit: number = 10
): Promise<string[]> {
  const result = await query(
    `SELECT DISTINCT ${field} 
     FROM "${table}" 
     WHERE ${field} ILIKE $1 
     AND ${field} IS NOT NULL 
     ORDER BY ${field} 
     LIMIT $2`,
    [`%${query}%`, limit]
  )

  return result.rows.map(row => row[field.split('.').pop() || field])
}

/**
 * Build filter SQL conditions from request parameters
 */
export function buildFilterConditions(
  searchParams: URLSearchParams,
  allowedFilters: Record<string, string>
): { conditions: string[], params: any[] } {
  const conditions: string[] = []
  const params: any[] = []
  let paramIndex = 1

  Object.entries(allowedFilters).forEach(([param, field]) => {
    const value = searchParams.get(param)
    if (value) {
      if (param.includes('_from')) {
        conditions.push(`${field} >= $${paramIndex++}`)
        params.push(value)
      } else if (param.includes('_to')) {
        conditions.push(`${field} <= $${paramIndex++}`)
        params.push(value)
      } else if (param.includes('_in')) {
        const values = value.split(',')
        const placeholders = values.map(() => `$${paramIndex++}`).join(', ')
        conditions.push(`${field} IN (${placeholders})`)
        params.push(...values)
      } else {
        conditions.push(`${field} = $${paramIndex++}`)
        params.push(value)
      }
    }
  })

  return { conditions, params }
}