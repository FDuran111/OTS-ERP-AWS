import { query } from './db'
import { v4 as uuidv4 } from 'uuid'

// Types
export interface PurchaseOrder {
  id: string
  poNumber: string
  vendorId: string
  jobId?: string
  createdBy: string
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SENT' | 'RECEIVED' | 'CANCELLED'
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  orderDate: Date
  requiredDate?: Date
  subtotal: number
  taxAmount: number
  shippingAmount: number
  discountAmount: number
  totalAmount: number
  shipToAddress?: string
  shipToCity?: string
  shipToState?: string
  shipToZip?: string
  paymentTerms?: string
  notes?: string
  internalNotes?: string
  approvedBy?: string
  approvedAt?: Date
  items?: PurchaseOrderItem[]
  createdAt: Date
  updatedAt: Date
}

export interface PurchaseOrderItem {
  id: string
  purchaseOrderId: string
  lineNumber: number
  materialId?: string
  itemCode?: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  taxRate: number
  taxAmount: number
  lineTotal: number
  receivedQuantity?: number
  notes?: string
}

export interface POApprovalRule {
  id: string
  name: string
  isActive: boolean
  minAmount?: number
  maxAmount?: number
  requiresManagerApproval: boolean
  requiresFinanceApproval: boolean
  autoApproveBelow?: number
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

// Create Purchase Order
export async function createPurchaseOrder(
  data: Omit<PurchaseOrder, 'id' | 'poNumber' | 'totalAmount' | 'createdAt' | 'updatedAt'>
): Promise<PurchaseOrder> {
  const poId = uuidv4()
  const poNumber = await generatePONumber()
  
  // Calculate total
  const subtotal = data.subtotal || 0
  const taxAmount = data.taxAmount || 0
  const shippingAmount = data.shippingAmount || 0
  const discountAmount = data.discountAmount || 0
  const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount
  
  const result = await query(
    `INSERT INTO "PurchaseOrder" (
      id, "poNumber", "vendorId", "jobId", "createdBy", status,
      "totalAmount", "approvedBy", "approvedAt", "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    RETURNING *`,
    [
      poId,
      poNumber,
      data.vendorId,
      data.jobId || null,
      data.createdBy,
      data.status || 'DRAFT',
      totalAmount,
      data.approvedBy || null,
      data.approvedAt || null
    ]
  )
  
  return {
    ...result.rows[0],
    priority: data.priority || 'NORMAL',
    orderDate: data.orderDate || new Date(),
    requiredDate: data.requiredDate,
    subtotal,
    taxAmount,
    shippingAmount,
    discountAmount,
    shipToAddress: data.shipToAddress,
    shipToCity: data.shipToCity,
    shipToState: data.shipToState,
    shipToZip: data.shipToZip,
    paymentTerms: data.paymentTerms,
    notes: data.notes,
    internalNotes: data.internalNotes
  }
}

// Get Purchase Orders
export async function getPurchaseOrders(filters?: {
  vendorId?: string
  jobId?: string
  status?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}): Promise<PurchaseOrder[]> {
  let sql = `
    SELECT 
      po.*,
      v.name as "vendorName",
      j."jobNumber",
      j.title as "jobTitle",
      u.name as "createdByName",
      approver.name as "approvedByName"
    FROM "PurchaseOrder" po
    LEFT JOIN "Vendor" v ON po."vendorId" = v.id
    LEFT JOIN "Job" j ON po."jobId" = j.id
    LEFT JOIN "User" u ON po."createdBy" = u.id
    LEFT JOIN "User" approver ON po."approvedBy" = approver.id
    WHERE 1=1
  `
  
  const params: any[] = []
  let paramIndex = 1
  
  if (filters?.vendorId) {
    sql += ` AND po."vendorId" = $${paramIndex}`
    params.push(filters.vendorId)
    paramIndex++
  }
  
  if (filters?.jobId) {
    sql += ` AND po."jobId" = $${paramIndex}`
    params.push(filters.jobId)
    paramIndex++
  }
  
  if (filters?.status) {
    sql += ` AND po.status = $${paramIndex}`
    params.push(filters.status)
    paramIndex++
  }
  
  if (filters?.startDate) {
    sql += ` AND po."createdAt" >= $${paramIndex}`
    params.push(filters.startDate)
    paramIndex++
  }
  
  if (filters?.endDate) {
    sql += ` AND po."createdAt" <= $${paramIndex}`
    params.push(filters.endDate)
    paramIndex++
  }
  
  sql += ` ORDER BY po."createdAt" DESC`
  
  if (filters?.limit) {
    sql += ` LIMIT $${paramIndex}`
    params.push(filters.limit)
    paramIndex++
  }
  
  if (filters?.offset) {
    sql += ` OFFSET $${paramIndex}`
    params.push(filters.offset)
  }
  
  const result = await query(sql, params)
  return result.rows.map(row => ({
    ...row,
    priority: 'NORMAL',
    orderDate: row.createdAt,
    subtotal: parseFloat(row.totalAmount || 0),
    taxAmount: 0,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: parseFloat(row.totalAmount || 0)
  }))
}

// Get single Purchase Order
export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder | null> {
  const result = await query(
    `SELECT
      po.*,
      v.name as "vendorName",
      j."jobNumber",
      j.description as "jobTitle",
      u.name as "createdByName",
      approver.name as "approvedByName"
    FROM "PurchaseOrder" po
    LEFT JOIN "Vendor" v ON po."vendorId" = v.id
    LEFT JOIN "Job" j ON po."jobId" = j.id
    LEFT JOIN "User" u ON po."createdBy" = u.id
    LEFT JOIN "User" approver ON po."approvedBy" = approver.id
    WHERE po.id = $1`,
    [id]
  )
  
  if (result.rows.length === 0) {
    return null
  }
  
  const po = result.rows[0]
  
  // Get line items
  const itemsResult = await query(
    `SELECT 
      poi.*,
      m.name as "materialName",
      m.code as "materialCode"
    FROM "PurchaseOrderItem" poi
    LEFT JOIN "Material" m ON poi."materialId" = m.id
    WHERE poi."purchaseOrderId" = $1
    ORDER BY poi."lineNumber"`,
    [id]
  )
  
  return {
    ...po,
    priority: 'NORMAL',
    orderDate: po.createdAt,
    subtotal: parseFloat(po.totalAmount || 0),
    taxAmount: 0,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: parseFloat(po.totalAmount || 0),
    items: itemsResult.rows.map(item => ({
      ...item,
      quantity: parseFloat(item.quantity),
      unitPrice: parseFloat(item.unitPrice),
      taxRate: parseFloat(item.taxRate || 0),
      taxAmount: parseFloat(item.taxAmount || 0),
      lineTotal: parseFloat(item.lineTotal || item.quantity * item.unitPrice)
    }))
  }
}

// Update Purchase Order
export async function updatePurchaseOrder(
  id: string,
  updates: Partial<PurchaseOrder>
): Promise<PurchaseOrder | null> {
  const fields = []
  const values = []
  let paramIndex = 1
  
  if (updates.vendorId !== undefined) {
    fields.push(`"vendorId" = $${paramIndex}`)
    values.push(updates.vendorId)
    paramIndex++
  }
  
  if (updates.jobId !== undefined) {
    fields.push(`"jobId" = $${paramIndex}`)
    values.push(updates.jobId)
    paramIndex++
  }
  
  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex}`)
    values.push(updates.status)
    paramIndex++
  }
  
  if (updates.totalAmount !== undefined) {
    fields.push(`"totalAmount" = $${paramIndex}`)
    values.push(updates.totalAmount)
    paramIndex++
  }
  
  if (updates.approvedBy !== undefined) {
    fields.push(`"approvedBy" = $${paramIndex}`)
    values.push(updates.approvedBy)
    paramIndex++
  }
  
  if (updates.approvedAt !== undefined) {
    fields.push(`"approvedAt" = $${paramIndex}`)
    values.push(updates.approvedAt)
    paramIndex++
  }
  
  if (fields.length === 0) {
    return await getPurchaseOrderById(id)
  }
  
  fields.push(`"updatedAt" = NOW()`)
  values.push(id)
  
  const sql = `
    UPDATE "PurchaseOrder"
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `
  
  const result = await query(sql, values)
  
  if (result.rows.length === 0) {
    return null
  }
  
  return await getPurchaseOrderById(id)
}

// Create Purchase Order Item
export async function createPurchaseOrderItem(
  item: Omit<PurchaseOrderItem, 'id' | 'taxAmount' | 'lineTotal'>
): Promise<PurchaseOrderItem> {
  const itemId = uuidv4()
  
  // Get next line number if not provided
  let lineNumber = item.lineNumber
  if (!lineNumber) {
    const maxResult = await query(
      `SELECT COALESCE(MAX("lineNumber"), 0) + 1 as "nextLineNumber"
       FROM "PurchaseOrderItem" WHERE "purchaseOrderId" = $1`,
      [item.purchaseOrderId]
    )
    lineNumber = maxResult.rows[0].nextLineNumber
  }
  
  const taxAmount = (item.quantity * item.unitPrice) * (item.taxRate / 100)
  const lineTotal = (item.quantity * item.unitPrice) + taxAmount
  
  const result = await query(
    `INSERT INTO "PurchaseOrderItem" (
      id, "purchaseOrderId", "lineNumber", "materialId", "itemCode",
      description, quantity, unit, "unitPrice", "taxRate", "taxAmount", "lineTotal",
      notes, "createdAt", "updatedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
    RETURNING *`,
    [
      itemId,
      item.purchaseOrderId,
      lineNumber,
      item.materialId || null,
      item.itemCode || null,
      item.description,
      item.quantity,
      item.unit,
      item.unitPrice,
      item.taxRate || 0,
      taxAmount,
      lineTotal,
      item.notes || null
    ]
  )
  
  // Update PO total
  await updatePOTotal(item.purchaseOrderId)
  
  return {
    ...result.rows[0],
    quantity: parseFloat(result.rows[0].quantity),
    unitPrice: parseFloat(result.rows[0].unitPrice),
    taxRate: parseFloat(result.rows[0].taxRate),
    taxAmount: parseFloat(result.rows[0].taxAmount),
    lineTotal: parseFloat(result.rows[0].lineTotal)
  }
}

// Update PO total after item changes
async function updatePOTotal(purchaseOrderId: string): Promise<void> {
  const result = await query(
    `SELECT 
      COALESCE(SUM("lineTotal"), 0) as total
     FROM "PurchaseOrderItem"
     WHERE "purchaseOrderId" = $1`,
    [purchaseOrderId]
  )
  
  await query(
    `UPDATE "PurchaseOrder" 
     SET "totalAmount" = $1, "updatedAt" = NOW()
     WHERE id = $2`,
    [result.rows[0].total, purchaseOrderId]
  )
}

// Delete Purchase Order Item
export async function deletePurchaseOrderItem(id: string): Promise<boolean> {
  const item = await query(
    `DELETE FROM "PurchaseOrderItem" WHERE id = $1 RETURNING "purchaseOrderId"`,
    [id]
  )
  
  if (item.rows.length > 0) {
    await updatePOTotal(item.rows[0].purchaseOrderId)
    return true
  }
  
  return false
}

// Approve Purchase Order
export async function approvePurchaseOrder(
  id: string,
  approverId: string,
  comments?: string
): Promise<PurchaseOrder | null> {
  const result = await query(
    `UPDATE "PurchaseOrder"
     SET status = 'APPROVED', 
         "approvedBy" = $2, 
         "approvedAt" = NOW(),
         "updatedAt" = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, approverId]
  )
  
  if (result.rows.length === 0) {
    return null
  }
  
  // Log approval history (if we add that table later)
  
  return await getPurchaseOrderById(id)
}

// Reject Purchase Order
export async function rejectPurchaseOrder(
  id: string,
  rejectedBy: string,
  reason: string
): Promise<PurchaseOrder | null> {
  const result = await query(
    `UPDATE "PurchaseOrder"
     SET status = 'REJECTED', 
         "updatedAt" = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  )
  
  if (result.rows.length === 0) {
    return null
  }
  
  // Log rejection (if we add history table)
  
  return await getPurchaseOrderById(id)
}

// Get POs pending approval
export async function getPendingApprovals(
  approverId?: string
): Promise<PurchaseOrder[]> {
  let sql = `
    SELECT 
      po.*,
      v.name as "vendorName",
      j."jobNumber",
      j.title as "jobTitle",
      u.name as "createdByName"
    FROM "PurchaseOrder" po
    LEFT JOIN "Vendor" v ON po."vendorId" = v.id
    LEFT JOIN "Job" j ON po."jobId" = j.id
    LEFT JOIN "User" u ON po."createdBy" = u.id
    WHERE po.status = 'PENDING_APPROVAL'
  `
  
  const params: any[] = []
  
  // If approverId provided, filter based on approval rules
  if (approverId) {
    // For now, just return all pending. In future, implement approval rules
  }
  
  sql += ` ORDER BY po."createdAt" DESC`
  
  const result = await query(sql, params)
  return result.rows.map(row => ({
    ...row,
    priority: 'NORMAL',
    orderDate: row.createdAt,
    subtotal: parseFloat(row.totalAmount || 0),
    taxAmount: 0,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: parseFloat(row.totalAmount || 0)
  }))
}

// Get vendor price history
export async function getVendorPriceHistory(
  vendorId: string,
  materialId?: string
): Promise<any[]> {
  let sql = `
    SELECT 
      vph.*,
      m.name as "materialName",
      m.code as "materialCode",
      m.unit as "materialUnit"
    FROM "VendorPriceHistory" vph
    JOIN "Material" m ON vph."materialId" = m.id
    WHERE vph."vendorId" = $1
  `
  
  const params: any[] = [vendorId]
  let paramIndex = 2
  
  if (materialId) {
    sql += ` AND vph."materialId" = $${paramIndex}`
    params.push(materialId)
    paramIndex++
  }
  
  sql += ` ORDER BY vph."effectiveDate" DESC`
  
  const result = await query(sql, params)
  return result.rows.map(row => ({
    ...row,
    unitPrice: parseFloat(row.unitPrice),
    minimumQuantity: parseFloat(row.minimumQuantity || 1)
  }))
}

// Record vendor price from PO
export async function recordVendorPrice(
  vendorId: string,
  materialId: string,
  unitPrice: number,
  purchaseOrderId?: string,
  recordedBy?: string
): Promise<void> {
  await query(
    `INSERT INTO "VendorPriceHistory" (
      id, "vendorId", "materialId", "unitPrice", 
      "effectiveDate", "purchaseOrderId", "recordedBy",
      "createdAt"
    ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, NOW())
    ON CONFLICT ON CONSTRAINT vendor_price_unique DO UPDATE
    SET "unitPrice" = $4, "purchaseOrderId" = $5, "recordedBy" = $6`,
    [
      uuidv4(),
      vendorId,
      materialId,
      unitPrice,
      purchaseOrderId || null,
      recordedBy || null
    ]
  )
}