import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export interface ServiceCall {
  id?: string
  callNumber?: string
  customerId: string
  jobId?: string | null
  
  // Call details
  callType: 'EMERGENCY' | 'ROUTINE' | 'SCHEDULED' | 'CALLBACK' | 'WARRANTY' | 'MAINTENANCE'
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY'
  status: 'NEW' | 'ASSIGNED' | 'DISPATCHED' | 'EN_ROUTE' | 'ON_SITE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'BILLED'
  
  // Problem description
  title: string
  description?: string
  problemCategory?: string
  urgencyReason?: string
  
  // Location
  serviceAddress?: string
  serviceCity?: string
  serviceState?: string
  serviceZip?: string
  serviceCountry?: string
  latitude?: number
  longitude?: number
  locationNotes?: string
  
  // Contact
  contactName?: string
  contactPhone?: string
  contactEmail?: string
  alternateContact?: string
  alternatePhone?: string
  
  // Scheduling
  requestedDate?: string
  requestedTime?: string
  scheduledDate?: string
  scheduledStartTime?: string
  scheduledEndTime?: string
  estimatedDuration?: number
  
  // Assignment
  assignedTechnicianId?: string
  assignedTeamId?: string
  dispatchedAt?: string
  dispatchedBy?: string
  
  // Service execution
  arrivedAt?: string
  startedAt?: string
  completedAt?: string
  workDescription?: string
  partsUsed?: any[]
  laborHours?: number
  
  // Customer interaction
  customerSignature?: string
  customerNotes?: string
  technicianNotes?: string
  followUpRequired?: boolean
  followUpDate?: string
  followUpNotes?: string
  
  // Billing
  billable?: boolean
  laborRate?: number
  materialCost?: number
  totalCost?: number
  invoiceNumber?: string
  billedAt?: string
  paidAt?: string
  
  // Quality and source
  callSource?: string
  customerSatisfaction?: number
  qualityScore?: number
  reviewNotes?: string
  
  // Warranty
  warrantyPeriod?: number
  warrantyExpires?: string
  isWarrantyCall?: boolean
  originalServiceId?: string
  
  // Metadata
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  cancelledAt?: string
  cancelledBy?: string
  cancellationReason?: string
}

export interface ServiceCallFilter {
  status?: string[]
  priority?: string[]
  callType?: string[]
  assignedTechnicianId?: string
  customerId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export async function createServiceCall(serviceCall: ServiceCall): Promise<ServiceCall> {
  const query = `
    INSERT INTO "ServiceCall" (
      "customerId", "callType", "priority", "status", "title", "description", 
      "problemCategory", "urgencyReason", "serviceAddress", "serviceCity", 
      "serviceState", "serviceZip", "serviceCountry", "latitude", "longitude", 
      "locationNotes", "contactName", "contactPhone", "contactEmail", 
      "alternateContact", "alternatePhone", "requestedDate", "requestedTime", 
      "scheduledDate", "scheduledStartTime", "scheduledEndTime", "estimatedDuration",
      "billable", "callSource", "createdBy"
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
      $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
    ) RETURNING *
  `
  
  const values = [
    serviceCall.customerId,
    serviceCall.callType,
    serviceCall.priority,
    serviceCall.status || 'NEW',
    serviceCall.title,
    serviceCall.description,
    serviceCall.problemCategory,
    serviceCall.urgencyReason,
    serviceCall.serviceAddress,
    serviceCall.serviceCity,
    serviceCall.serviceState,
    serviceCall.serviceZip,
    serviceCall.serviceCountry || 'US',
    serviceCall.latitude,
    serviceCall.longitude,
    serviceCall.locationNotes,
    serviceCall.contactName,
    serviceCall.contactPhone,
    serviceCall.contactEmail,
    serviceCall.alternateContact,
    serviceCall.alternatePhone,
    serviceCall.requestedDate,
    serviceCall.requestedTime,
    serviceCall.scheduledDate,
    serviceCall.scheduledStartTime,
    serviceCall.scheduledEndTime,
    serviceCall.estimatedDuration,
    serviceCall.billable !== false,
    serviceCall.callSource,
    serviceCall.createdBy
  ]
  
  const result = await pool.query(query, values)
  return result.rows[0]
}

export async function getServiceCalls(filter: ServiceCallFilter = {}): Promise<ServiceCall[]> {
  let query = `
    SELECT sc.*, 
           c."companyName", c."firstName", c."lastName",
           u."firstName" as "techFirstName", u."lastName" as "techLastName"
    FROM "ServiceCall" sc
    LEFT JOIN "Customer" c ON sc."customerId" = c.id
    LEFT JOIN "User" u ON sc."assignedTechnicianId" = u.id
    WHERE 1=1
  `
  
  const values: any[] = []
  let paramIndex = 1
  
  if (filter.status && filter.status.length > 0) {
    query += ` AND sc."status" = ANY($${paramIndex})`
    values.push(filter.status)
    paramIndex++
  }
  
  if (filter.priority && filter.priority.length > 0) {
    query += ` AND sc."priority" = ANY($${paramIndex})`
    values.push(filter.priority)
    paramIndex++
  }
  
  if (filter.callType && filter.callType.length > 0) {
    query += ` AND sc."callType" = ANY($${paramIndex})`
    values.push(filter.callType)
    paramIndex++
  }
  
  if (filter.assignedTechnicianId) {
    query += ` AND sc."assignedTechnicianId" = $${paramIndex}`
    values.push(filter.assignedTechnicianId)
    paramIndex++
  }
  
  if (filter.customerId) {
    query += ` AND sc."customerId" = $${paramIndex}`
    values.push(filter.customerId)
    paramIndex++
  }
  
  if (filter.dateFrom) {
    query += ` AND sc."createdAt" >= $${paramIndex}`
    values.push(filter.dateFrom)
    paramIndex++
  }
  
  if (filter.dateTo) {
    query += ` AND sc."createdAt" <= $${paramIndex}`
    values.push(filter.dateTo)
    paramIndex++
  }
  
  if (filter.search) {
    query += ` AND (
      sc."callNumber" ILIKE $${paramIndex} OR
      sc."title" ILIKE $${paramIndex} OR
      sc."description" ILIKE $${paramIndex} OR
      c."companyName" ILIKE $${paramIndex} OR
      c."firstName" ILIKE $${paramIndex} OR
      c."lastName" ILIKE $${paramIndex}
    )`
    values.push(`%${filter.search}%`)
    paramIndex++
  }
  
  query += ` ORDER BY sc."createdAt" DESC`
  
  const result = await pool.query(query, values)
  return result.rows
}

export async function getServiceCallById(id: string): Promise<ServiceCall | null> {
  const query = `
    SELECT sc.*, 
           c."companyName", c."firstName", c."lastName", c."phone", c."email",
           u."firstName" as "techFirstName", u."lastName" as "techLastName"
    FROM "ServiceCall" sc
    LEFT JOIN "Customer" c ON sc."customerId" = c.id
    LEFT JOIN "User" u ON sc."assignedTechnicianId" = u.id
    WHERE sc.id = $1
  `
  
  const result = await pool.query(query, [id])
  return result.rows[0] || null
}

export async function updateServiceCall(id: string, updates: Partial<ServiceCall>): Promise<ServiceCall> {
  const fields = []
  const values = []
  let paramIndex = 1
  
  // Build dynamic update query
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'id') {
      fields.push(`"${key}" = $${paramIndex}`)
      values.push(value)
      paramIndex++
    }
  }
  
  fields.push(`"updatedAt" = NOW()`)
  values.push(id)
  
  const query = `
    UPDATE "ServiceCall" 
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `
  
  const result = await pool.query(query, values)
  return result.rows[0]
}

export async function updateServiceCallStatus(
  id: string, 
  status: ServiceCall['status'], 
  changedBy?: string,
  notes?: string
): Promise<ServiceCall> {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Update the service call
    const updateQuery = `
      UPDATE "ServiceCall" 
      SET "status" = $1, "updatedAt" = NOW()
      WHERE id = $2
      RETURNING *
    `
    const result = await client.query(updateQuery, [status, id])
    
    // Add manual history entry with notes if provided
    if (notes || changedBy) {
      await client.query(`
        INSERT INTO "ServiceCallHistory" ("serviceCallId", "toStatus", "changedBy", "notes", "automaticChange")
        VALUES ($1, $2, $3, $4, false)
      `, [id, status, changedBy, notes])
    }
    
    await client.query('COMMIT')
    return result.rows[0]
    
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteServiceCall(id: string): Promise<boolean> {
  const query = `DELETE FROM "ServiceCall" WHERE id = $1`
  const result = await pool.query(query, [id])
  return result.rowCount > 0
}

export async function getServiceCallHistory(serviceCallId: string) {
  const query = `
    SELECT sch.*, u."firstName", u."lastName"
    FROM "ServiceCallHistory" sch
    LEFT JOIN "User" u ON sch."changedBy" = u.id
    WHERE sch."serviceCallId" = $1
    ORDER BY sch."changedAt" ASC
  `
  
  const result = await pool.query(query, [serviceCallId])
  return result.rows
}

export async function getServiceCallStats() {
  const query = `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE "status" = 'NEW') as new_calls,
      COUNT(*) FILTER (WHERE "status" IN ('ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS')) as active_calls,
      COUNT(*) FILTER (WHERE "status" = 'COMPLETED') as completed_calls,
      COUNT(*) FILTER (WHERE "priority" IN ('URGENT', 'EMERGENCY')) as urgent_calls,
      COUNT(*) FILTER (WHERE "createdAt" >= CURRENT_DATE) as today_calls,
      AVG("customerSatisfaction") FILTER (WHERE "customerSatisfaction" IS NOT NULL) as avg_satisfaction
    FROM "ServiceCall"
    WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
  `
  
  const result = await pool.query(query)
  return result.rows[0]
}

export async function searchNearbyServiceCalls(latitude: number, longitude: number, radiusMiles: number = 10) {
  // Simple distance calculation using lat/lng (for more accurate results, use PostGIS)
  const query = `
    SELECT sc.*, 
           c."companyName", c."firstName", c."lastName",
           (
             3959 * acos(
               cos(radians($1)) * cos(radians(sc.latitude)) * 
               cos(radians(sc.longitude) - radians($2)) + 
               sin(radians($1)) * sin(radians(sc.latitude))
             )
           ) AS distance
    FROM "ServiceCall" sc
    LEFT JOIN "Customer" c ON sc."customerId" = c.id
    WHERE sc.latitude IS NOT NULL 
      AND sc.longitude IS NOT NULL
      AND (
        3959 * acos(
          cos(radians($1)) * cos(radians(sc.latitude)) * 
          cos(radians(sc.longitude) - radians($2)) + 
          sin(radians($1)) * sin(radians(sc.latitude))
        )
      ) <= $3
    ORDER BY distance ASC
  `
  
  const result = await pool.query(query, [latitude, longitude, radiusMiles])
  return result.rows
}

// Service templates functions
export async function getServiceTemplates() {
  const query = `
    SELECT * FROM "ServiceTemplate"
    WHERE active = true
    ORDER BY name ASC
  `
  
  const result = await pool.query(query)
  return result.rows
}

export async function createServiceTemplate(template: any) {
  const query = `
    INSERT INTO "ServiceTemplate" (
      name, description, "serviceType", "defaultPriority", 
      "estimatedDuration", "defaultChecklist", "requiredMaterials", instructions
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `
  
  const values = [
    template.name,
    template.description,
    template.serviceType,
    template.defaultPriority,
    template.estimatedDuration,
    JSON.stringify(template.defaultChecklist || []),
    JSON.stringify(template.requiredMaterials || []),
    template.instructions
  ]
  
  const result = await pool.query(query, values)
  return result.rows[0]
}