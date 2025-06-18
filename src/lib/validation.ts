import { z } from 'zod'

// Common validation schemas
export const commonSchemas = {
  id: z.string().uuid('Invalid ID format'),
  email: z.string().email('Invalid email format').or(z.literal('')),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number').optional(),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonNegativeNumber: z.number().min(0, 'Must be non-negative'),
  date: z.string().datetime('Invalid date format').or(z.date()),
  currency: z.number().min(0, 'Amount must be non-negative').max(999999999, 'Amount too large'),
}

// Business entity schemas
export const customerSchema = z.object({
  companyName: z.string().max(100, 'Company name too long').optional(),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: commonSchemas.email,
  phone: z.string().max(20, 'Phone number too long').optional(),
  address: z.string().max(200, 'Address too long').optional(),
  city: z.string().max(50, 'City name too long').optional(),
  state: z.string().max(2, 'State must be 2 characters').optional(),
  zip: z.string().max(10, 'ZIP code too long').optional(),
})

export const jobSchema = z.object({
  customerId: commonSchemas.id,
  type: z.enum(['SERVICE_CALL', 'COMMERCIAL_PROJECT']),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  address: z.string().max(200, 'Address too long').optional(),
  city: z.string().max(50, 'City name too long').optional(),
  state: z.string().max(2, 'State must be 2 characters').optional(),
  zip: z.string().max(10, 'ZIP code too long').optional(),
  scheduledDate: z.string().datetime().optional(),
  estimatedHours: commonSchemas.positiveNumber.optional(),
  estimatedCost: commonSchemas.currency.optional(),
  assignedUserIds: z.array(commonSchemas.id).optional(),
})

export const materialSchema = z.object({
  code: z.string().min(1, 'Code is required').max(20, 'Code too long'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  manufacturer: z.string().max(100, 'Manufacturer name too long').optional(),
  unit: z.string().min(1, 'Unit is required').max(10, 'Unit too long'),
  cost: commonSchemas.currency,
  price: commonSchemas.currency,
  markup: commonSchemas.positiveNumber.default(1.5),
  category: z.string().min(1, 'Category is required').max(50, 'Category too long'),
  vendorId: commonSchemas.id.optional(),
  inStock: commonSchemas.nonNegativeNumber.int('Stock must be a whole number').default(0),
  minStock: commonSchemas.nonNegativeNumber.int('Min stock must be a whole number').default(0),
  location: z.string().max(50, 'Location too long').optional(),
})

export const leadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  companyName: z.string().max(100, 'Company name too long').optional(),
  email: commonSchemas.email,
  phone: z.string().max(20, 'Phone number too long').optional(),
  street: z.string().max(200, 'Street address too long').optional(),
  city: z.string().max(50, 'City name too long').optional(),
  state: z.string().max(2, 'State must be 2 characters').optional(),
  zip: z.string().max(10, 'ZIP code too long').optional(),
  source: z.string().max(50, 'Source too long').optional(),
  estimatedValue: commonSchemas.currency.optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  notes: z.string().max(2000, 'Notes too long').optional(),
  nextFollowUpDate: z.string().datetime().optional(),
  assignedTo: commonSchemas.id.optional(),
})

export const timeEntrySchema = z.object({
  jobId: commonSchemas.id,
  phaseId: commonSchemas.id.optional(),
  description: z.string().max(500, 'Description too long').optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  hours: commonSchemas.positiveNumber.optional(),
})

export const invoiceSchema = z.object({
  jobId: commonSchemas.id,
  dueDate: z.string().datetime(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  lineItems: z.array(z.object({
    type: z.enum(['LABOR', 'MATERIAL', 'OTHER']),
    description: z.string().min(1, 'Description is required').max(200, 'Description too long'),
    quantity: commonSchemas.positiveNumber,
    unitPrice: commonSchemas.currency,
    materialId: commonSchemas.id.optional(),
    laborRateId: commonSchemas.id.optional(),
  })).min(1, 'At least one line item is required'),
})

// Input sanitization functions
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return ''
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000) // Limit length
}

export function sanitizeNumber(input: unknown): number {
  const num = Number(input)
  return isNaN(num) ? 0 : Math.max(0, Math.min(num, 999999999))
}

export function sanitizeId(input: unknown): string | null {
  if (typeof input !== 'string') return null
  
  // Basic UUID format check
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(input) ? input : null
}

// Search and filter validation
export const searchSchema = z.object({
  q: z.string().max(100, 'Search query too long').optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.string().max(20).optional(),
  category: z.string().max(50).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
})

// File upload validation
export const fileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
  contentType: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9\-\+\.]*\/[a-zA-Z0-9][a-zA-Z0-9\-\+\.]*$/, 'Invalid content type'),
  size: z.number().int().min(1, 'File cannot be empty').max(10 * 1024 * 1024, 'File too large (max 10MB)'),
})

/**
 * Validates and sanitizes pagination parameters
 */
export function validatePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit
  
  return { page, limit, offset }
}

/**
 * Validates and sanitizes sort parameters
 */
export function validateSort(searchParams: URLSearchParams, allowedFields: string[]) {
  const sortBy = searchParams.get('sortBy')
  const sortOrder = searchParams.get('sortOrder')
  
  const validSortBy = sortBy && allowedFields.includes(sortBy) ? sortBy : allowedFields[0]
  const validSortOrder = sortOrder === 'asc' ? 'asc' : 'desc'
  
  return { sortBy: validSortBy, sortOrder: validSortOrder }
}