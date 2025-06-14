import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET all customers
export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        _count: {
          select: {
            jobs: true
          }
        },
        jobs: {
          select: {
            id: true,
            status: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transform the data to match the frontend format
    const transformedCustomers = customers.map(customer => {
      const activeJobs = customer.jobs.filter(job => 
        ['SCHEDULED', 'DISPATCHED', 'IN_PROGRESS'].includes(job.status)
      ).length

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
        totalJobs: customer._count.jobs,
        activeJobs,
        status: activeJobs > 0 ? 'active' : 'inactive',
        quickbooksId: customer.quickbooksId,
      }
    })

    return NextResponse.json(transformedCustomers)
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

// Schema for creating a customer
const createCustomerSchema = z.object({
  companyName: z.string().optional(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().optional(),
  phone: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
})

// POST create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createCustomerSchema.parse(body)

    const customer = await prisma.customer.create({
      data: {
        companyName: data.companyName,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zip: data.zip,
      }
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating customer:', error)
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    )
  }
}