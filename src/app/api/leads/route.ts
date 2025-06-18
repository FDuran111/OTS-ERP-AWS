import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
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

    // Build WHERE conditions
    const conditions = []
    const params = []
    let paramIndex = 1

    if (status) {
      conditions.push(`status = $${paramIndex++}`)
      params.push(status)
    }

    if (assignedTo) {
      conditions.push(`"assignedTo" = $${paramIndex++}`)
      params.push(assignedTo)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Simple SQL query to get leads
    const result = await query(
      `SELECT * FROM "Lead" ${whereClause} ORDER BY "updatedAt" DESC`,
      params
    )

    const leads = result.rows

    // Group leads by status for pipeline view
    const leadsByStatus = leads.reduce((acc, lead) => {
      if (!acc[lead.status]) {
        acc[lead.status] = []
      }
      acc[lead.status].push({
        ...lead,
        daysSinceLastContact: lead.lastContactDate 
          ? Math.floor((new Date().getTime() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        overdue: lead.nextFollowUpDate && new Date(lead.nextFollowUpDate) < new Date()
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

    // Insert lead using SQL
    const result = await query(
      `INSERT INTO "Lead" (
        id, "firstName", "lastName", "companyName", email, phone,
        street, city, state, zip, source, "estimatedValue",
        priority, description, notes, "nextFollowUpDate",
        "assignedTo", "lastContactDate", status, "createdAt", "updatedAt"
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        data.firstName,
        data.lastName,
        data.companyName || null,
        data.email || null,
        data.phone || null,
        data.street || null,
        data.city || null,
        data.state || null,
        data.zip || null,
        data.source || 'MANUAL',
        data.estimatedValue || null,
        data.priority || 'MEDIUM',
        data.description || null,
        data.notes || null,
        data.nextFollowUpDate || null,
        data.assignedTo || null,
        new Date(),
        'NEW',
        new Date(),
        new Date()
      ]
    )

    const lead = result.rows[0]

    // Create initial activity if assignedTo exists
    if (data.assignedTo) {
      try {
        await query(
          `INSERT INTO "LeadActivity" (
            id, "leadId", type, description, "completedDate", "createdBy", "createdAt", "updatedAt"
          ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7)`,
          [
            lead.id,
            'NOTE',
            'Lead created',
            new Date(),
            data.assignedTo,
            new Date(),
            new Date()
          ]
        )
      } catch (error) {
        console.warn('Could not create initial activity:', error)
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