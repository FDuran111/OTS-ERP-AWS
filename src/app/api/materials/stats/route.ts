import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get total materials count
    const totalMaterials = await prisma.material.count({
      where: { active: true }
    })

    // Get low stock count
    const lowStockMaterials = await prisma.material.count({
      where: {
        active: true,
        inStock: {
          lte: prisma.material.fields.minStock
        }
      }
    })

    // Get out of stock count
    const outOfStockMaterials = await prisma.material.count({
      where: {
        active: true,
        inStock: 0
      }
    })

    // Calculate in stock (not low stock and not out of stock)
    const inStockMaterials = totalMaterials - lowStockMaterials

    // Get categories
    const categories = await prisma.material.groupBy({
      by: ['category'],
      where: { active: true },
      _count: {
        category: true
      }
    })

    // Get recent material usage
    const recentUsage = await prisma.materialUsage.findMany({
      include: {
        material: {
          select: {
            code: true,
            name: true,
          }
        },
        job: {
          select: {
            jobNumber: true,
            description: true,
          }
        }
      },
      orderBy: {
        usedAt: 'desc'
      },
      take: 10
    })

    const stats = [
      {
        title: 'Total Items',
        value: totalMaterials.toString(),
        icon: 'inventory',
        color: '#1d8cf8'
      },
      {
        title: 'Low Stock',
        value: lowStockMaterials.toString(),
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