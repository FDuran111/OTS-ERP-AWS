import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const updateLeadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  estimatedValue: z.number().optional(),
  priority: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  nextFollowUpDate: z.string().optional().transform((str) => str ? new Date(str) : undefined),
  assignedTo: z.string().optional(),
})

// GET single lead
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: resolvedParams.id },
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        activities: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            user: {
              select: {
                name: true
              }
            }
          }
        },
        estimates: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            creator: {
              select: {
                name: true
              }
            }
          }
        }
      }
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error('Error fetching lead:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
      { status: 500 }
    )
  }
}

// PATCH update lead
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const body = await request.json()
    const data = updateLeadSchema.parse(body)

    // Check if status is being updated
    const currentLead = await prisma.lead.findUnique({
      where: { id: resolvedParams.id }
    })

    if (!currentLead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      )
    }

    const updateData: any = {
      ...data,
      source: data.source as any,
      lastContactDate: new Date()
    }
    
    // Handle assignedTo separately for proper type safety
    if (data.assignedTo) {
      updateData.assignedUser = {
        connect: { id: data.assignedTo }
      }
      delete updateData.assignedTo
    }

    const lead = await prisma.lead.update({
      where: { id: resolvedParams.id },
      data: updateData,
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

    // Create activity if status changed
    if (data.status && data.status !== currentLead.status) {
      await prisma.leadActivity.create({
        data: {
          leadId: resolvedParams.id,
          type: 'STATUS_CHANGE',
          description: `Status changed from ${currentLead.status} to ${data.status}`,
          completedDate: new Date(),
          createdBy: data.assignedTo || currentLead.assignedTo || 'system'
        }
      })
    }

    return NextResponse.json(lead)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    )
  }
}

// DELETE lead
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    await prisma.lead.delete({
      where: { id: resolvedParams.id }
    })

    return NextResponse.json({ message: 'Lead deleted successfully' })
  } catch (error) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}