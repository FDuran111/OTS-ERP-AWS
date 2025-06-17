import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get all materials to calculate stats (simple approach)
    const allMaterials = await prisma.material.findMany({
      where: { active: true },
      select: { 
        inStock: true, 
        minStock: true, 
        category: true 
      }
    })

    const totalMaterials = allMaterials.length
    const lowStockCount = allMaterials.filter(m => m.inStock <= m.minStock).length
    const outOfStockMaterials = allMaterials.filter(m => m.inStock === 0).length
    const inStockMaterials = totalMaterials - lowStockCount

    // Simple category counting
    const categoryMap = new Map()
    allMaterials.forEach(m => {
      categoryMap.set(m.category, (categoryMap.get(m.category) || 0) + 1)
    })
    
    const categories = Array.from(categoryMap.entries()).map(([name, count]) => ({
      name,
      count
    }))

    // Skip material usage for now to avoid complexity
    const recentUsage = []

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
      categories: categories.map(cat => ({
        name: cat.category,
        count: cat._count.category
      })),
      recentUsage: recentUsage.map(usage => ({
        id: usage.id,
        materialCode: usage.material.code,
        materialName: usage.material.name,
        jobNumber: usage.job.jobNumber,
        jobDescription: usage.job.description,
        quantity: usage.quantity,
        usedAt: usage.usedAt,
        usedBy: usage.usedBy,
      }))
    })
  } catch (error) {
    console.error('Error fetching material stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch material statistics' },
      { status: 500 }
    )
  }
}