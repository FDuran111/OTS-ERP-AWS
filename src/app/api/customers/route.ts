import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { withErrorHandler, validateExists } from '@/lib/error-handler'
import { customerSchema } from '@/lib/validation'
import { searchCustomers } from '@/lib/search'
import { withRBAC, AuthenticatedRequest } from '@/lib/rbac-middleware'

// Fixed RBAC configuration to use requiredRoles instead of roles

// GET all customers with search and pagination
export const GET = withRBAC({
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
})(withErrorHandler(async (request: AuthenticatedRequest) => {
  const { searchParams } = new URL(request.url)
  const user = request.user

  // Check if requesting employee-created customers
  const createdByEmployee = searchParams.get('createdByEmployee') === 'true'
  const employeeCreatedOnly = searchParams.get('employeeCreatedOnly') === 'true'

  // Employees can only see customers they created
  if (user.role === 'EMPLOYEE') {
    const result = await query(
      `SELECT c.*,
        COUNT(DISTINCT j.id) FILTER (WHERE j.status IN ('SCHEDULED', 'IN_PROGRESS')) as active_jobs,
        COUNT(DISTINCT j.id) as total_jobs
      FROM "Customer" c
      LEFT JOIN "Job" j ON c.id = j."customerId"
      WHERE c."createdBy" = $1
      GROUP BY c.id
      ORDER BY c."createdAt" DESC`,
      [user.id]
    )

    const transformedCustomers = result.rows.map((customer: any) => ({
      id: customer.id,
      name: customer.companyName || `${customer.firstName} ${customer.lastName}`,
      companyName: customer.companyName,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      createdAt: customer.createdAt
    }))

    return NextResponse.json({
      customers: transformedCustomers,
      pagination: { total: result.rows.length, page: 1, limit: 100 }
    })
  }

  // Admin/Foreman requesting employee-created customers only
  if (employeeCreatedOnly && (user.role === 'OWNER_ADMIN' || user.role === 'FOREMAN')) {
    const result = await query(
      `SELECT c.*,
        u.name as created_by_name,
        COUNT(DISTINCT j.id) FILTER (WHERE j.status IN ('SCHEDULED', 'IN_PROGRESS')) as active_jobs,
        COUNT(DISTINCT j.id) as total_jobs
      FROM "Customer" c
      LEFT JOIN "User" u ON c."createdBy" = u.id
      LEFT JOIN "Job" j ON c.id = j."customerId"
      WHERE c."createdByEmployee" = true
      GROUP BY c.id, u.name
      ORDER BY c."createdAt" DESC`
    )

    const transformedCustomers = result.rows.map((customer: any) => ({
      id: customer.id,
      name: customer.companyName || `${customer.firstName} ${customer.lastName}`,
      companyName: customer.companyName,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zip: customer.zip,
      createdBy: customer.created_by_name,
      createdAt: customer.createdAt,
      totalJobs: parseInt(customer.total_jobs) || 0,
      activeJobs: parseInt(customer.active_jobs) || 0
    }))

    return NextResponse.json({
      customers: transformedCustomers,
      pagination: { total: result.rows.length, page: 1, limit: 100 }
    })
  }

  // Admin/Foreman get all customers (excluding employee-created by default)
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
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE']
})(withErrorHandler(async (request: AuthenticatedRequest) => {
  const body = await request.json()
  const user = request.user
  const data = customerSchema.parse(body)
  const isEmployeeCreated = body.createdByEmployee === true || user.role === 'EMPLOYEE'

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
      address, city, state, zip, "createdBy", "createdByEmployee", "createdAt", "updatedAt"
    ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
      user.id || null,
      isEmployeeCreated,
      new Date(),
      new Date()
    ]
  )

  const customer = result.rows[0]
  validateExists(customer, 'Customer')

  return NextResponse.json({
    ...customer,
    name: customer.companyName || `${customer.firstName} ${customer.lastName}`
  }, { status: 201 })
}))