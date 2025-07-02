import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getDbFeatures } from '@/lib/db-utils'
import { withRBAC } from '@/lib/rbac-middleware'

interface HoursUpdate {
  userId: string
  regular: number
  overtime: number
}

export const POST = withRBAC({ 
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN'] 
})(async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id
    const body = await request.json()
    const { hours } = body as { hours: Record<string, { regular: number; overtime: number }> }
    
    if (!hours || typeof hours !== 'object') {
      return NextResponse.json(
        { error: 'Invalid hours data' },
        { status: 400 }
      )
    }
    
    // Check database features
    const dbFeatures = await getDbFeatures()
    
    // Verify job exists
    const jobResult = await query(
      'SELECT id FROM "Job" WHERE id = $1',
      [jobId]
    )
    
    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }
    
    // Start transaction
    await query('BEGIN')
    
    try {
      // Process each crew member's hours
      for (const [userId, hoursData] of Object.entries(hours)) {
        const { regular, overtime } = hoursData
        
        // Validate hours
        if (regular < 0 || overtime < 0 || regular > 24 || overtime > 24) {
          throw new Error(`Invalid hours for user ${userId}`)
        }
        
        // Check if assignment exists
        const assignmentResult = await query(
          'SELECT id FROM "JobAssignment" WHERE "jobId" = $1 AND "userId" = $2',
          [jobId, userId]
        )
        
        if (assignmentResult.rows.length > 0) {
          // Update existing assignment
          if (dbFeatures.hasHoursTracking) {
            await query(
              `UPDATE "JobAssignment" 
               SET "hoursWorked" = $1, "overtimeHours" = $2, "updatedAt" = CURRENT_TIMESTAMP
               WHERE "jobId" = $3 AND "userId" = $4`,
              [regular, overtime, jobId, userId]
            )
          }
        } else if (regular > 0 || overtime > 0) {
          // Create new assignment if hours > 0
          const insertColumns = ['id', 'jobId', 'userId', 'assignedAt', 'assignedBy']
          const insertValues: any[] = [
            generateId(),
            jobId,
            userId,
            new Date(),
            request.headers.get('x-user-id') || 'system'
          ]
          
          if (dbFeatures.hasHoursTracking) {
            insertColumns.push('hoursWorked', 'overtimeHours')
            insertValues.push(regular, overtime)
          }
          
          const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ')
          const columnNames = insertColumns.map(col => `"${col}"`).join(', ')
          
          await query(
            `INSERT INTO "JobAssignment" (${columnNames}) VALUES (${placeholders})`,
            insertValues
          )
        }
        
        // Update daily hours tracking if table exists
        if (dbFeatures.hasCrewDailyHours && (regular > 0 || overtime > 0)) {
          const today = new Date().toISOString().split('T')[0]
          
          await query(
            `INSERT INTO "CrewDailyHours" 
             (id, "userId", date, "regularHours", "overtimeHours", "jobIds")
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT ("userId", date) 
             DO UPDATE SET 
               "regularHours" = "CrewDailyHours"."regularHours" + $4,
               "overtimeHours" = "CrewDailyHours"."overtimeHours" + $5,
               "jobIds" = array_append("CrewDailyHours"."jobIds", $7),
               "updatedAt" = CURRENT_TIMESTAMP`,
            [generateId(), userId, today, regular, overtime, [jobId], jobId]
          )
        }
      }
      
      // Commit transaction
      await query('COMMIT')
      
      return NextResponse.json({
        success: true,
        message: 'Hours updated successfully',
        metadata: {
          hasHoursTracking: dbFeatures.hasHoursTracking,
          hasDailyTracking: dbFeatures.hasCrewDailyHours
        }
      })
    } catch (error) {
      // Rollback on error
      await query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('Error updating hours:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to update hours',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
})

// Get hours for a job
export const GET = withRBAC({ 
  requiredRoles: ['OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE'] 
})(async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id
    const dbFeatures = await getDbFeatures()
    
    // Build query based on available columns
    const hoursColumn = dbFeatures.hasHoursTracking 
      ? 'ja."hoursWorked"' 
      : '8 as "hoursWorked"'
    
    const overtimeColumn = dbFeatures.hasOvertimeTracking
      ? 'ja."overtimeHours"'
      : '0 as "overtimeHours"'
    
    const result = await query(
      `SELECT 
        u.id as "userId",
        u.name,
        u.role,
        ${hoursColumn},
        ${overtimeColumn},
        ja."assignedAt"
      FROM "JobAssignment" ja
      INNER JOIN "User" u ON ja."userId" = u.id
      WHERE ja."jobId" = $1
      ORDER BY u.name`,
      [jobId]
    )
    
    return NextResponse.json({
      hours: result.rows.map(row => ({
        userId: row.userId,
        name: row.name,
        role: row.role,
        regular: parseFloat(row.hoursWorked) || 0,
        overtime: parseFloat(row.overtimeHours) || 0,
        assignedAt: row.assignedAt
      })),
      metadata: {
        hasActualHours: dbFeatures.hasHoursTracking,
        defaultHoursUsed: !dbFeatures.hasHoursTracking
      }
    })
  } catch (error) {
    console.error('Error fetching hours:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch hours' },
      { status: 500 }
    )
  }
})

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}