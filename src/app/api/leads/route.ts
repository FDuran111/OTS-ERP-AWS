import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  source: z.string().optional(),
  estimatedValue: z.number().optional(),
  priority: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  nextFollowUpDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  assignedTo: z.string().optional(),
})

// GET all leads
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')

    const whereClause: any = {}

    if (status) {
      whereClause.status = status
    }

    if (assignedTo) {
      whereClause.assignedTo = assignedTo
    }

    // Simple query without any includes to test basic functionality
    const leads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: [
        { updatedAt: 'desc' }
      ]
    })

    // Group leads by status for pipeline view
    const leadsByStatus = leads.reduce((acc, lead) => {
      if (!acc[lead.status]) {
        acc[lead.status] = []
      }
      acc[lead.status].push({
        ...lead,
        daysSinceLastContact: lead.lastContactDate 
          ? Math.floor((new Date().getTime() - lead.lastContactDate.getTime()) / (1000 * 60 * 60 * 24))
          : null,
        overdue: lead.nextFollowUpDate && lead.nextFollowUpDate < new Date()
      })
      return acc
    }, {} as Record<string, any[]>)

    return NextResponse.json({
      leads,
      leadsByStatus,
      totalLeads: leads.length,
      statusCounts: Object.keys(leadsByStatus).reduce((acc, status) => {
        acc[status] = leadsByStatus[status].length
        return acc
      }, {} as Record<string, number>)
    })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

// POST create a new lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = createLeadSchema.parse(body)

    const lead = await prisma.lead.create({
      data: {
        ...data,
        source: data.source as any,
        lastContactDate: new Date()
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Create initial activity (only if assignedTo exists and is a valid user)
    if (data.assignedTo) {
      try {
        await prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            type: 'NOTE',
            description: 'Lead created',
            completedDate: new Date(),
            createdBy: data.assignedTo
          }
        })
      } catch (error) {
        console.warn('Could not create initial activity:', error)
        // Continue without the activity if user doesn't exist
      }
    }

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}