import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { z } from 'zod'

const jobAttachmentSchema = z.object({
  jobId: z.string().min(1),
  fileId: z.string().uuid(),
  attachmentType: z.string().min(1),
  category: z.string().optional(),
  phase: z.string().optional(),
  description: z.string().optional(),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

const customerAttachmentSchema = z.object({
  customerId: z.string().min(1),
  fileId: z.string().uuid(),
  attachmentType: z.string().min(1),
  description: z.string().optional(),
  isPrimary: z.boolean().optional(),
})

const materialAttachmentSchema = z.object({
  materialId: z.string().min(1),
  fileId: z.string().uuid(),
  attachmentType: z.string().min(1),
  description: z.string().optional(),
  isPrimary: z.boolean().optional(),
})

// GET attachments for jobs, customers, or materials
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')
    const customerId = searchParams.get('customerId')
    const materialId = searchParams.get('materialId')
    const attachmentType = searchParams.get('attachmentType')
    const imagesOnly = searchParams.get('imagesOnly') === 'true'

    if (jobId) {
      // Get job attachments
      let whereClause = 'WHERE ja."jobId" = $1 AND fa.active = true'
      const params = [jobId]
      let paramIndex = 2

      if (attachmentType) {
        whereClause += ` AND ja."attachmentType" = $${paramIndex}`
        params.push(attachmentType)
        paramIndex++
      }

      if (imagesOnly) {
        whereClause += ' AND fa."isImage" = true'
      }

      const result = await query(`
        SELECT 
          ja.id as "attachmentId",
          ja."attachmentType",
          ja.category,
          ja.phase,
          ja.description as "attachmentDescription",
          ja."isPrimary",
          ja."sortOrder",
          ja."attachedAt",
          
          fa.id as "fileId",
          fa."fileName",
          fa."originalName",
          fa."mimeType",
          fa."fileSize",
          fa."fileExtension",
          fa."filePath",
          fa."fileUrl",
          fa."isImage",
          fa."imageWidth",
          fa."imageHeight",
          fa."thumbnailPath",
          fa."thumbnailUrl",
          fa.description as "fileDescription",
          fa.tags,
          fa.metadata,
          fa."uploadedAt"
          
        FROM "JobAttachment" ja
        JOIN "FileAttachment" fa ON ja."fileId" = fa.id
        ${whereClause}
        ORDER BY ja."sortOrder", ja."attachedAt"
      `, params)

      const attachments = result.rows.map(row => ({
        attachmentId: row.attachmentId,
        attachmentType: row.attachmentType,
        category: row.category,
        phase: row.phase,
        attachmentDescription: row.attachmentDescription,
        isPrimary: row.isPrimary,
        sortOrder: row.sortOrder,
        attachedAt: row.attachedAt,
        file: {
          id: row.fileId,
          fileName: row.fileName,
          originalName: row.originalName,
          mimeType: row.mimeType,
          fileSize: row.fileSize,
          fileExtension: row.fileExtension,
          filePath: row.filePath,
          fileUrl: row.fileUrl,
          isImage: row.isImage,
          imageWidth: row.imageWidth,
          imageHeight: row.imageHeight,
          thumbnailPath: row.thumbnailPath,
          thumbnailUrl: row.thumbnailUrl,
          description: row.fileDescription,
          tags: row.tags || [],
          metadata: row.metadata,
          uploadedAt: row.uploadedAt
        }
      }))

      return NextResponse.json(attachments)
    }

    if (customerId) {
      // Get customer attachments
      let whereClause = 'WHERE ca."customerId" = $1 AND fa.active = true'
      const params = [customerId]
      let paramIndex = 2

      if (attachmentType) {
        whereClause += ` AND ca."attachmentType" = $${paramIndex}`
        params.push(attachmentType)
        paramIndex++
      }

      if (imagesOnly) {
        whereClause += ' AND fa."isImage" = true'
      }

      const result = await query(`
        SELECT 
          ca.id as "attachmentId",
          ca."attachmentType",
          ca.description as "attachmentDescription",
          ca."isPrimary",
          ca."attachedAt",
          
          fa.id as "fileId",
          fa."fileName",
          fa."originalName",
          fa."mimeType",
          fa."fileSize",
          fa."fileExtension",
          fa."filePath",
          fa."fileUrl",
          fa."isImage",
          fa."imageWidth",
          fa."imageHeight",
          fa."thumbnailPath",
          fa."thumbnailUrl",
          fa.description as "fileDescription",
          fa.tags,
          fa.metadata,
          fa."uploadedAt"
          
        FROM "CustomerAttachment" ca
        JOIN "FileAttachment" fa ON ca."fileId" = fa.id
        ${whereClause}
        ORDER BY ca."isPrimary" DESC, ca."attachedAt"
      `, params)

      const attachments = result.rows.map(row => ({
        attachmentId: row.attachmentId,
        attachmentType: row.attachmentType,
        attachmentDescription: row.attachmentDescription,
        isPrimary: row.isPrimary,
        attachedAt: row.attachedAt,
        file: {
          id: row.fileId,
          fileName: row.fileName,
          originalName: row.originalName,
          mimeType: row.mimeType,
          fileSize: row.fileSize,
          fileExtension: row.fileExtension,
          filePath: row.filePath,
          fileUrl: row.fileUrl,
          isImage: row.isImage,
          imageWidth: row.imageWidth,
          imageHeight: row.imageHeight,
          thumbnailPath: row.thumbnailPath,
          thumbnailUrl: row.thumbnailUrl,
          description: row.fileDescription,
          tags: row.tags || [],
          metadata: row.metadata,
          uploadedAt: row.uploadedAt
        }
      }))

      return NextResponse.json(attachments)
    }

    if (materialId) {
      // Get material attachments
      let whereClause = 'WHERE ma."materialId" = $1 AND fa.active = true'
      const params = [materialId]
      let paramIndex = 2

      if (attachmentType) {
        whereClause += ` AND ma."attachmentType" = $${paramIndex}`
        params.push(attachmentType)
        paramIndex++
      }

      if (imagesOnly) {
        whereClause += ' AND fa."isImage" = true'
      }

      const result = await query(`
        SELECT 
          ma.id as "attachmentId",
          ma."attachmentType",
          ma.description as "attachmentDescription",
          ma."isPrimary",
          ma."attachedAt",
          
          fa.id as "fileId",
          fa."fileName",
          fa."originalName",
          fa."mimeType",
          fa."fileSize",
          fa."fileExtension",
          fa."filePath",
          fa."fileUrl",
          fa."isImage",
          fa."imageWidth",
          fa."imageHeight",
          fa."thumbnailPath",
          fa."thumbnailUrl",
          fa.description as "fileDescription",
          fa.tags,
          fa.metadata,
          fa."uploadedAt"
          
        FROM "MaterialAttachment" ma
        JOIN "FileAttachment" fa ON ma."fileId" = fa.id
        ${whereClause}
        ORDER BY ma."isPrimary" DESC, ma."attachedAt"
      `, params)

      const attachments = result.rows.map(row => ({
        attachmentId: row.attachmentId,
        attachmentType: row.attachmentType,
        attachmentDescription: row.attachmentDescription,
        isPrimary: row.isPrimary,
        attachedAt: row.attachedAt,
        file: {
          id: row.fileId,
          fileName: row.fileName,
          originalName: row.originalName,
          mimeType: row.mimeType,
          fileSize: row.fileSize,
          fileExtension: row.fileExtension,
          filePath: row.filePath,
          fileUrl: row.fileUrl,
          isImage: row.isImage,
          imageWidth: row.imageWidth,
          imageHeight: row.imageHeight,
          thumbnailPath: row.thumbnailPath,
          thumbnailUrl: row.thumbnailUrl,
          description: row.fileDescription,
          tags: row.tags || [],
          metadata: row.metadata,
          uploadedAt: row.uploadedAt
        }
      }))

      return NextResponse.json(attachments)
    }

    return NextResponse.json(
      { error: 'Either jobId, customerId, or materialId is required' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Error fetching attachments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
      { status: 500 }
    )
  }
}

// POST create new attachment link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Determine which type of attachment this is
    if ('jobId' in body) {
      const data = jobAttachmentSchema.parse(body)
      
      // Verify job exists
      const jobCheck = await query('SELECT id FROM "Job" WHERE id = $1', [data.jobId])
      if (jobCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        )
      }

      // Verify file exists
      const fileCheck = await query('SELECT id FROM "FileAttachment" WHERE id = $1 AND active = true', [data.fileId])
      if (fileCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'File not found or inactive' },
          { status: 404 }
        )
      }

      const result = await query(`
        INSERT INTO "JobAttachment" (
          "jobId", "fileId", "attachmentType", "category", "phase",
          "description", "isPrimary", "sortOrder"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        data.jobId,
        data.fileId,
        data.attachmentType,
        data.category || null,
        data.phase || null,
        data.description || null,
        data.isPrimary || false,
        data.sortOrder || 0
      ])

      const attachment = result.rows[0]

      return NextResponse.json({
        id: attachment.id,
        jobId: attachment.jobId,
        fileId: attachment.fileId,
        attachmentType: attachment.attachmentType,
        category: attachment.category,
        phase: attachment.phase,
        description: attachment.description,
        isPrimary: attachment.isPrimary,
        sortOrder: attachment.sortOrder,
        attachedAt: attachment.attachedAt
      }, { status: 201 })
    }

    if ('customerId' in body) {
      const data = customerAttachmentSchema.parse(body)
      
      // Verify customer exists
      const customerCheck = await query('SELECT id FROM "Customer" WHERE id = $1', [data.customerId])
      if (customerCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Customer not found' },
          { status: 404 }
        )
      }

      // Verify file exists
      const fileCheck = await query('SELECT id FROM "FileAttachment" WHERE id = $1 AND active = true', [data.fileId])
      if (fileCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'File not found or inactive' },
          { status: 404 }
        )
      }

      const result = await query(`
        INSERT INTO "CustomerAttachment" (
          "customerId", "fileId", "attachmentType", "description", "isPrimary"
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        data.customerId,
        data.fileId,
        data.attachmentType,
        data.description || null,
        data.isPrimary || false
      ])

      const attachment = result.rows[0]

      return NextResponse.json({
        id: attachment.id,
        customerId: attachment.customerId,
        fileId: attachment.fileId,
        attachmentType: attachment.attachmentType,
        description: attachment.description,
        isPrimary: attachment.isPrimary,
        attachedAt: attachment.attachedAt
      }, { status: 201 })
    }

    if ('materialId' in body) {
      const data = materialAttachmentSchema.parse(body)
      
      // Verify material exists
      const materialCheck = await query('SELECT id FROM "Material" WHERE id = $1', [data.materialId])
      if (materialCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'Material not found' },
          { status: 404 }
        )
      }

      // Verify file exists
      const fileCheck = await query('SELECT id FROM "FileAttachment" WHERE id = $1 AND active = true', [data.fileId])
      if (fileCheck.rows.length === 0) {
        return NextResponse.json(
          { error: 'File not found or inactive' },
          { status: 404 }
        )
      }

      const result = await query(`
        INSERT INTO "MaterialAttachment" (
          "materialId", "fileId", "attachmentType", "description", "isPrimary"
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        data.materialId,
        data.fileId,
        data.attachmentType,
        data.description || null,
        data.isPrimary || false
      ])

      const attachment = result.rows[0]

      return NextResponse.json({
        id: attachment.id,
        materialId: attachment.materialId,
        fileId: attachment.fileId,
        attachmentType: attachment.attachmentType,
        description: attachment.description,
        isPrimary: attachment.isPrimary,
        attachedAt: attachment.attachedAt
      }, { status: 201 })
    }

    return NextResponse.json(
      { error: 'Invalid attachment data. Must include jobId, customerId, or materialId' },
      { status: 400 }
    )

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error creating attachment:', error)
    return NextResponse.json(
      { error: 'Failed to create attachment' },
      { status: 500 }
    )
  }
}