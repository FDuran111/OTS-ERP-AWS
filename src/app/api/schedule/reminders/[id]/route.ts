import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { action, snoozedUntil } = await request.json()

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    let updateQuery = ''
    let queryParams: any[] = []

    switch (action) {
      case 'acknowledge':
        updateQuery = `UPDATE "JobReminder" SET status = 'ACKNOWLEDGED', "acknowledgedAt" = NOW() WHERE id = $1 RETURNING *`
        queryParams = [id]
        break
      
      case 'snooze':
        if (!snoozedUntil) {
          return NextResponse.json(
            { error: 'snoozedUntil date is required for snooze action' },
            { status: 400 }
          )
        }
        updateQuery = `UPDATE "JobReminder" SET status = 'SNOOZED', "snoozedUntil" = $2 WHERE id = $1 RETURNING *`
        queryParams = [id, new Date(snoozedUntil)]
        break
      
      case 'dismiss':
        updateQuery = `UPDATE "JobReminder" SET status = 'DISMISSED', "acknowledgedAt" = NOW() WHERE id = $1 RETURNING *`
        queryParams = [id]
        break

      case 'reactivate':
        updateQuery = `UPDATE "JobReminder" SET status = 'ACTIVE', "acknowledgedAt" = NULL, "snoozedUntil" = NULL WHERE id = $1 RETURNING *`
        queryParams = [id]
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: acknowledge, snooze, dismiss, or reactivate' },
          { status: 400 }
        )
    }

    try {
      const result = await query(updateQuery, queryParams)
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Reminder not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        reminder: result.rows[0]
      })
    } catch (tableError) {
      return NextResponse.json(
        { error: 'Enhanced reminder system not available. Reminder actions require JobReminder table.' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Error updating reminder:', error)
    return NextResponse.json(
      { error: 'Failed to update reminder' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    try {
      const result = await query(
        'DELETE FROM "JobReminder" WHERE id = $1 RETURNING *',
        [id]
      )
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Reminder not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json({
        success: true,
        deleted: result.rows[0]
      })
    } catch (tableError) {
      return NextResponse.json(
        { error: 'Enhanced reminder system not available' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Error deleting reminder:', error)
    return NextResponse.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    )
  }
}