import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    // Simple fallback stats if database fails
    let totalMaterials = 0
    let lowStockCount = 0
    let outOfStockMaterials = 0
    let categories: Array<{name: string, count: number}> = []
    
    try {
      // Get material statistics using SQL
      const [
        totalResult,
        lowStockResult,
        outOfStockResult,
        categoriesResult
      ] = await Promise.all([
        // Total active materials
        query('SELECT COUNT(*) as count FROM "Material" WHERE active = TRUE'),
        
        // Low stock materials
        query('SELECT COUNT(*) as count FROM "Material" WHERE active = TRUE AND "inStock" <= "minStock"'),
        
        // Out of stock materials
        query('SELECT COUNT(*) as count FROM "Material" WHERE active = TRUE AND "inStock" = 0'),
        
        // Materials by category
        query(`
          SELECT category, COUNT(*) as count 
          FROM "Material" 
          WHERE active = TRUE 
          GROUP BY category 
          ORDER BY count DESC
        `)
      ])

      totalMaterials = parseInt(totalResult.rows[0].count)
      lowStockCount = parseInt(lowStockResult.rows[0].count)
      outOfStockMaterials = parseInt(outOfStockResult.rows[0].count)
      categories = categoriesResult.rows.map(row => ({
        name: row.category,
        count: parseInt(row.count)
      }))
    } catch (dbError) {
      console.warn('Database error in stats, using fallback values:', dbError)
      // Use fallback values (already set above)
    }

    const inStockMaterials = Math.max(0, totalMaterials - lowStockCount)
    const recentUsage: any[] = [] // Skip for now

    const stats = [
      {
        title: 'Total Items',
        value: totalMaterials.toString(),
        icon: 'inventory',
        color: '#1d8cf8'
      },
      {
        title: 'Low Stock',
        value: lowStockCount.toString(),
        icon: 'warning',
        color: '#fd5d93'
      },
      {
        title: 'Out of Stock',
        value: outOfStockMaterials.toString(),
        icon: 'error',
        color: '#ff8d72'
      },
      {
        title: 'In Stock',
        value: inStockMaterials.toString(),
        icon: 'check_circle',
        color: '#00bf9a'
      }
    ]

    return NextResponse.json({
      stats,
      categories,
      recentUsage
    })
  } catch (error) {
    console.error('Error fetching material stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch material statistics' },
      { status: 500 }
    )
  }
}