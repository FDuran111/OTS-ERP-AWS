import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withErrorHandler, validateExists } from '@/lib/error-handler'
import { customerSchema } from '@/lib/validation'
import { searchCustomers } from '@/lib/search'
import { withRBAC } from '@/lib/rbac-middleware'

// GET all customers with search and pagination
export const GET = withRBAC({
  requiredRoles: ['OWNER', 'ADMIN', 'OFFICE']
})(withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url)
  
  const options = {
    q: searchParams.get('q') || undefined,
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    sortBy: searchParams.get('sortBy') || 'c."createdAt"',
    sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
    filters: {
      ...(searchParams.get('type') && { 
        type: searchParams.get('type') === 'Commercial' ? '"companyName" IS NOT NULL' : '"companyName" IS NULL'
      }),
      ...(searchParams.get('status') && { status: searchParams.get('status') })
    }
  }

  const result = await searchCustomers(options)

  // Transform the data to match the frontend format
  const transformedCustomers = result.data.map((customer: any) => {
    const activeJobs = parseInt(customer.active_jobs) || 0
    const totalJobs = parseInt(customer.total_jobs) || 0

    return {
      id: customer.id,
      name: customer.companyName || `${customer.firstName} ${customer.lastName}`,
      companyName: customer.companyName,
      firstName: customer.firstName,
      lastName: customer.lastName,
      type: customer.companyName ? 'Commercial' : 'Residential',
      phone: customer.phone,
      email: customer.email,
      address: customer.address ? `${customer.address}, ${customer.city}, ${customer.state} ${customer.zip}` : '',
      addressLine: customer.address,
      city: customer.city,
      state: customer.state,
      zip: customer.zip,
      totalJobs,
      activeJobs,
      status: activeJobs > 0 ? 'active' : 'inactive',
      quickbooksId: customer.quickbooksId,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    }
  })

  return NextResponse.json({
    customers: transformedCustomers,
    pagination: result.pagination
  })
}))

// POST create a new customer
export const POST = withRBAC({
  requiredRoles: ['OWNER', 'ADMIN', 'OFFICE']
})(withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const data = customerSchema.parse(body)

  // Check for duplicate email if provided
  if (data.email) {
    const existingCustomer = await query(
      'SELECT id FROM "Customer" WHERE email = $1',
      [data.email]
    )
    
    if (existingCustomer.rows.length > 0) {
      return NextResponse.json(
        { error: 'A customer with this email already exists' },
        { status: 409 }
      )
    }
  }

  const result = await query(
    `INSERT INTO "Customer" (
      id, "companyName", "firstName", "lastName", email, phone,
      address, city, state, zip, "createdAt", "updatedAt"
    ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      data.companyName || null,
      data.firstName,
      data.lastName,
      data.email || null,
      data.phone || null,
      data.address || null,
      data.city || null,
      data.state || null,
      data.zip || null,
      new Date(),
      new Date()
    ]
  )

  const customer = result.rows[0]
  validateExists(customer, 'Customer')

  return NextResponse.json(customer, { status: 201 })
}))