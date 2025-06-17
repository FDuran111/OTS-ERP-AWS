import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Create a simple material if none exist
    const existingMaterials = await prisma.material.count()
    
    if (existingMaterials === 0) {
      await prisma.material.create({
        data: {
          code: 'TEST-WIRE',
          name: 'Test Wire',
          description: 'Test electrical wire',
          manufacturer: 'Square D',
          unit: 'ft',
          cost: 1.00,
          price: 2.00,
          category: 'Wire',
          minStock: 100,
          inStock: 50,
        }
      })
      
      await prisma.material.create({
        data: {
          code: 'TEST-OUTLET',
          name: 'Test Outlet',
          description: 'Test electrical outlet',
          manufacturer: 'Leviton',
          unit: 'each',
          cost: 3.00,
          price: 6.00,
          category: 'Devices',
          minStock: 20,
          inStock: 5,
        }
      })
    }

    const materialCount = await prisma.material.count()
    
    return NextResponse.json({
      success: true,
      message: 'Test data created',
      materialCount,
    })
  } catch (error) {
    console.error('Error creating test data:', error)
    return NextResponse.json(
      { error: 'Failed to create test data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}