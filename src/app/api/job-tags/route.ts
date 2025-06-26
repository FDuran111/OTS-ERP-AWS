import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const jobTagSchema = z.object({
  tagName: z.string().min(1).max(50),
  tagType: z.enum(['GENERAL', 'PRIORITY', 'COMPLEXITY', 'CERTIFICATION']).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
})

const tagAssignmentSchema = z.object({
  jobId: z.string().min(1),
  tagIds: z.array(z.string().uuid()),
})

// GET job tags
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tagType = searchParams.get('tagType')
    const jobId = searchParams.get('jobId')
    const active = searchParams.get('active') !== 'false'

    if (jobId) {
      // Get tags assigned to a specific job
      const result = await query(`
        SELECT 
          jt.*,
          jta."assignedAt",
          jta."assignedBy",
          u.name as "assignedByName"
        FROM "JobTag" jt
        JOIN "JobTagAssignment" jta ON jt.id = jta."tagId"
        LEFT JOIN "User" u ON jta."assignedBy" = u.id
        WHERE jta."jobId" = $1 AND jt.active = $2
        ORDER BY jt."tagType", jt."tagName"
      `, [jobId, active])

      const jobTags = result.rows.map(row => ({
        id: row.id,
        tagName: row.tagName,
        tagType: row.tagType,
        description: row.description,
        color: row.color,
        active: row.active,
        assignedAt: row.assignedAt,
        assignedBy: row.assignedBy,
        assignedByName: row.assignedByName,
        createdAt: row.createdAt
      }))

      return NextResponse.json(jobTags)
    }

    // Get all tags with optional filtering
    let whereClause = active ? 'WHERE active = true' : 'WHERE 1=1'
    const params: any[] = []

    if (tagType) {
      whereClause += ` AND "tagType" = $1`
      params.push(tagType)
    }

    const result = await query(`
      SELECT 
        jt.*,
        COUNT(jta."jobId") as "usageCount"
      FROM "JobTag" jt
      LEFT JOIN "JobTagAssignment" jta ON jt.id = jta."tagId"
      ${whereClause}
      GROUP BY jt.id, jt."tagName", jt."tagType", jt."description", jt."color", jt."active", jt."createdAt"
      ORDER BY jt."tagType", jt."tagName"
    `, params)

    const tags = result.rows.map(row => ({
      id: row.id,
      tagName: row.tagName,
      tagType: row.tagType,
      description: row.description,
      color: row.color,
      active: row.active,
      usageCount: parseInt(row.usageCount || 0),
      createdAt: row.createdAt
    }))

    return NextResponse.json(tags)

  } catch (error) {
    console.error('Error fetching job tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job tags' },
      { status: 500 }
    )
  }
}

// POST create new job tag or assign tags to job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a tag assignment request
    if ('jobId' in body && 'tagIds' in body) {
      const data = tagAssignmentSchema.parse(body)

      // Verify job exists
      const jobCheck = await query('SELECT id FROM "Job" WHERE id = $1', [data.jobId])
      if (jobCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }

      // Remove existing tag assignments for this job
      await query('DELETE FROM "JobTagAssignment" WHERE "jobId" = $1', [data.jobId])

      // Add new tag assignments
      const assignments = []
      for (const tagId of data.tagIds) {
        // Verify tag exists
        const tagCheck = await query('SELECT id FROM "JobTag" WHERE id = $1 AND active = true', [tagId])
        if (tagCheck.rows.length > 0) {
          await query(`
            INSERT INTO "JobTagAssignment" ("jobId", "tagId")
            VALUES ($1, $2)
            ON CONFLICT ("jobId", "tagId") DO NOTHING
          `, [data.jobId, tagId])
          assignments.push(tagId)
        }
      }

      return NextResponse.json({
        success: true,
        jobId: data.jobId,
        assignedTagIds: assignments
      })
    }

    // Create new tag
    const data = jobTagSchema.parse(body)

    // Check if tag name already exists
    const existingTag = await query(
      'SELECT id FROM "JobTag" WHERE "tagName" = $1',
      [data.tagName]
    )

    if (existingTag.rows.length > 0) {
      return NextResponse.json(
        { error: 'Tag name already exists' },
        { status: 409 }
      )
    }

    const result = await query(`
      INSERT INTO "JobTag" ("tagName", "tagType", "description", "color")
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      data.tagName,
      data.tagType || 'GENERAL',
      data.description || null,
      data.color || '#757575'
    ])

    const tag = result.rows[0]

    return NextResponse.json({
      id: tag.id,
      tagName: tag.tagName,
      tagType: tag.tagType,
      description: tag.description,
      color: tag.color,
      active: tag.active,
      createdAt: tag.createdAt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating job tag or assignment:', error)
    return NextResponse.json(
      { error: 'Failed to create job tag or assignment' },
      { status: 500 }
    )
  }
}