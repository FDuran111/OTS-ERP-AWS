import { query } from './db'
import { v4 as uuidv4 } from 'uuid'

// Simple PurchaseOrder type matching existing schema
export interface SimplePurchaseOrder {
  id: string
  poNumber: string
  jobId?: string
  phaseId?: string
  vendorId: string
  createdBy: string
  status: string
  totalAmount: number
  approvedBy?: string
  approvedAt?: Date
  quickbooksId?: string
  createdAt: Date
  updatedAt: Date
}

// Generate PO number
async function generatePONumber(): Promise<string> {
  const year = new Date().getFullYear()
  const result = await query(
    `SELECT COUNT(*) as count FROM "PurchaseOrder" 
     WHERE EXTRACT(YEAR FROM "createdAt") = $1`,
    [year]
  )
  
  const count = parseInt(result.rows[0].count) + 1
  return `PO-${year}-${count.toString().padStart(5, '0')}`
}

// Get Purchase Orders
export async function getSimplePurchaseOrders(filters?: {
  vendorId?: string
  jobId?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<SimplePurchaseOrder[]> {
  let whereConditions = []
  let params = []
  let paramCount = 1

  if (filters?.vendorId) {
    whereConditions.push(`"vendorId" = $${paramCount}`)
    params.push(filters.vendorId)
    paramCount++
  }

  if (filters?.jobId) {
    whereConditions.push(`"jobId" = $${paramCount}`)
    params.push(filters.jobId)
    paramCount++
  }

  if (filters?.status) {
    whereConditions.push(`status = $${paramCount}`)
    params.push(filters.status)
    paramCount++
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}` 
    : ''

  const limit = filters?.limit || 50
  const offset = filters?.offset || 0

  params.push(limit, offset)

  const result = await query(
    `SELECT po.*, 
            v.name as vendor_name,
            j.description as job_description,
            u.name as created_by_name
     FROM "PurchaseOrder" po
     LEFT JOIN "Vendor" v ON po."vendorId" = v.id
     LEFT JOIN "Job" j ON po."jobId" = j.id
     LEFT JOIN "User" u ON po."createdBy" = u.id
     ${whereClause}
     ORDER BY po."createdAt" DESC
     LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
    params
  )

  return result.rows.map(row => ({
    id: row.id,
    poNumber: row.poNumber,
    jobId: row.jobId,
    phaseId: row.phaseId,
    vendorId: row.vendorId,
    createdBy: row.createdBy,
    status: row.status,
    totalAmount: parseFloat(row.totalAmount),
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    quickbooksId: row.quickbooksId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    // Additional fields for display
    vendorName: row.vendor_name,
    jobDescription: row.job_description,
    createdByName: row.created_by_name
  }))
}

// Create simple Purchase Order
export async function createSimplePurchaseOrder(data: {
  vendorId: string
  jobId?: string
  createdBy: string
  totalAmount: number
  status?: string
}): Promise<SimplePurchaseOrder> {
  const poId = uuidv4()
  const poNumber = await generatePONumber()
  
  const result = await query(
    `INSERT INTO "PurchaseOrder" (
      id, "poNumber", "vendorId", "jobId", "createdBy", 
      status, "totalAmount", "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING *`,
    [
      poId,
      poNumber,
      data.vendorId,
      data.jobId || null,
      data.createdBy,
      data.status || 'DRAFT',
      data.totalAmount
    ]
  )

  return result.rows[0]
}

// Approve Purchase Order
export async function approveSimplePurchaseOrder(
  poId: string,
  approvedBy: string
): Promise<SimplePurchaseOrder> {
  const result = await query(
    `UPDATE "PurchaseOrder" 
     SET status = 'APPROVED', 
         "approvedBy" = $2, 
         "approvedAt" = NOW(),
         "updatedAt" = NOW()
     WHERE id = $1
     RETURNING *`,
    [poId, approvedBy]
  )

  if (result.rows.length === 0) {
    throw new Error('Purchase order not found')
  }

  return result.rows[0]
}

// Get pending approvals count
export async function getSimplePendingApprovals(): Promise<number> {
  const result = await query(
    `SELECT COUNT(*) as count 
     FROM "PurchaseOrder" 
     WHERE status IN ('PENDING', 'DRAFT')`
  )

  return parseInt(result.rows[0].count)
}