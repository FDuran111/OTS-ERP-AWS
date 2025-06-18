import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || 'month'
    
    const now = new Date()
    let startDate: Date
    let endDate: Date = now
    
    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default: // month
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
    }

    // Get material usage in the time period
    const materialUsage = await prisma.materialUsage.findMany({
      where: {
        usedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        material: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            cost: true,
            unit: true
          }
        },
        job: {
          select: {
            jobNumber: true,
            description: true,
            jobType: true
          }
        }
      }
    })

    // Calculate total usage cost
    const totalUsageCost = materialUsage.reduce((sum, usage) => {
      return sum + (usage.quantity * usage.material.cost)
    }, 0)

    // Usage by material
    const usageByMaterial: Record<string, {
      materialId: string,
      code: string,
      name: string,
      category: string,
      totalQuantity: number,
      totalCost: number,
      unit: string,
      usageCount: number
    }> = {}

    materialUsage.forEach(usage => {
      const materialId = usage.material.id
      if (!usageByMaterial[materialId]) {
        usageByMaterial[materialId] = {
          materialId,
          code: usage.material.code,
          name: usage.material.name,
          category: usage.material.category,
          totalQuantity: 0,
          totalCost: 0,
          unit: usage.material.unit,
          usageCount: 0
        }
      }
      
      usageByMaterial[materialId].totalQuantity += usage.quantity
      usageByMaterial[materialId].totalCost += usage.quantity * usage.material.cost
      usageByMaterial[materialId].usageCount += 1
    })

    // Convert to array and sort by cost
    const topMaterialsByUsage = Object.values(usageByMaterial)
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 10)

    // Usage by category
    const usageByCategory: Record<string, {
      category: string,
      totalQuantity: number,
      totalCost: number,
      materialCount: number
    }> = {}

    Object.values(usageByMaterial).forEach(material => {
      const category = material.category
      if (!usageByCategory[category]) {
        usageByCategory[category] = {
          category,
          totalQuantity: 0,
          totalCost: 0,
          materialCount: 0
        }
      }
      
      usageByCategory[category].totalCost += material.totalCost
      usageByCategory[category].materialCount += 1
    })

    // Usage by job type
    const usageByJobType: Record<string, {
      jobType: string,
      totalCost: number,
      jobCount: number
    }> = {}

    materialUsage.forEach(usage => {
      const jobType = usage.job.jobType || 'Other'
      if (!usageByJobType[jobType]) {
        usageByJobType[jobType] = {
          jobType,
          totalCost: 0,
          jobCount: 0
        }
      }
      
      usageByJobType[jobType].totalCost += usage.quantity * usage.material.cost
    })

    // Get unique jobs that used materials
    const uniqueJobs = new Set(materialUsage.map(usage => usage.jobId))
    Object.keys(usageByJobType).forEach(jobType => {
      const jobsOfType = materialUsage.filter(usage => 
        (usage.job.jobType || 'Other') === jobType
      )
      const uniqueJobsOfType = new Set(jobsOfType.map(usage => usage.jobId))
      usageByJobType[jobType].jobCount = uniqueJobsOfType.size
    })

    // Recent material usage
    const recentUsage = materialUsage
      .sort((a, b) => b.usedAt.getTime() - a.usedAt.getTime())
      .slice(0, 20)
      .map(usage => ({
        id: usage.id,
        materialCode: usage.material.code,
        materialName: usage.material.name,
        quantity: usage.quantity,
        unit: usage.material.unit,
        cost: usage.quantity * usage.material.cost,
        jobNumber: usage.job.jobNumber,
        jobDescription: usage.job.description,
        usedAt: usage.usedAt,
        usedBy: usage.usedBy
      }))

    // Current stock levels
    const lowStockMaterials = await prisma.material.findMany({
      where: {
        active: true,
        inStock: {
          lte: prisma.material.fields.minStock
        }
      },
      select: {
        id: true,
        code: true,
        name: true,
        inStock: true,
        minStock: true,
        unit: true,
        category: true
      },
      orderBy: {
        inStock: 'asc'
      },
      take: 10
    })

    return NextResponse.json({
      summary: {
        totalUsageCost,
        totalUsageEntries: materialUsage.length,
        uniqueMaterialsUsed: Object.keys(usageByMaterial).length,
        uniqueJobsWithMaterials: uniqueJobs.size
      },
      topMaterialsByUsage,
      usageByCategory: Object.values(usageByCategory),
      usageByJobType: Object.values(usageByJobType),
      recentUsage,
      lowStockMaterials,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        range: timeRange
      }
    })
  } catch (error) {
    console.error('Error generating material usage report:', error)
    return NextResponse.json(
      { error: 'Failed to generate material usage report' },
      { status: 500 }
    )
  }
}