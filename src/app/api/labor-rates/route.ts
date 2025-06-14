import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// GET all labor rates
export async function GET() {
  try {
    // Mock labor rates data
    const mockLaborRates = [
      {
        id: '1',
        name: 'Apprentice Electrician',
        description: 'Entry level electrician',
        hourlyRate: 45,
        skillLevel: 'APPRENTICE',
        active: true,
      },
      {
        id: '2',
        name: 'Journeyman Electrician',
        description: 'Certified journeyman electrician',
        hourlyRate: 65,
        skillLevel: 'JOURNEYMAN',
        active: true,
      },
      {
        id: '3',
        name: 'Master Electrician',
        description: 'Master electrician with full certification',
        hourlyRate: 85,
        skillLevel: 'MASTER',
        active: true,
      },
      {
        id: '4',
        name: 'Service Call Rate',
        description: 'Standard service call rate',
        hourlyRate: 95,
        skillLevel: 'SERVICE',
        active: true,
      }
    ]

    return NextResponse.json(mockLaborRates)
  } catch (error) {
    console.error('Error fetching labor rates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch labor rates' },
      { status: 500 }
    )
  }
}

// POST create new labor rate
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, description, hourlyRate, skillLevel } = body

    const laborRate = await prisma.laborRate.create({
      data: {
        name,
        description,
        hourlyRate,
        skillLevel,
        active: true,
      }
    })

    return NextResponse.json(laborRate, { status: 201 })
  } catch (error) {
    console.error('Error creating labor rate:', error)
    return NextResponse.json(
      { error: 'Failed to create labor rate' },
      { status: 500 }
    )
  }
}