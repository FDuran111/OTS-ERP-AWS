import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = searchParams.get('limit') || '50'

    // Fetch low stock notifications
    const result = await query(`
      SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n."materialId",
        n.read,
        n."createdAt",
        m.code as "materialCode",
        m.name as "materialName",
        m."inStock",
        m."minStock",
        fc."stockoutDate",
        fc."stockoutProbability"
      FROM "LowStockNotification" n
      LEFT JOIN "Material" m ON n."materialId" = m.id
      LEFT JOIN "ForecastCache" fc ON m.id = fc."materialId"
      WHERE 1=1 ${unreadOnly ? 'AND n.read = FALSE' : ''}
      ORDER BY n."createdAt" DESC
      LIMIT $1
    `, [parseInt(limit)])

    // Get unread count
    const unreadCountResult = await query(`
      SELECT COUNT(*) as unread_count
      FROM "LowStockNotification"
      WHERE read = FALSE
    `)

    const unreadCount = parseInt(unreadCountResult.rows[0]?.unread_count || 0)

    return NextResponse.json({
      notifications: result.rows.map(row => ({
        id: row.id,
        type: row.type,
        title: row.title,
        message: row.message,
        materialId: row.materialId,
        materialCode: row.materialCode,
        materialName: row.materialName,
        currentStock: parseFloat(row.inStock || 0),
        minStock: parseFloat(row.minStock || 0),
        stockoutDate: row.stockoutDate,
        stockoutProbability: parseFloat(row.stockoutProbability || 0),
        read: row.read,
        createdAt: row.createdAt
      })),
      unreadCount
    })

  } catch (error) {
    console.error('Error fetching low stock notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationIds, markAsRead } = body

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'notificationIds array is required' },
        { status: 400 }
      )
    }

    // Mark notifications as read/unread
    await query(`
      UPDATE "LowStockNotification"
      SET read = $1, "updatedAt" = CURRENT_TIMESTAMP
      WHERE id = ANY($2)
    `, [markAsRead !== false, notificationIds])

    return NextResponse.json({
      success: true,
      updatedCount: notificationIds.length
    })

  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}
