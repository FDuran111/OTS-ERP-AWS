import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/storage-locations - Get all storage locations
export async function GET() {
  try {
    const locations = await prisma.storageLocation.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(locations)
  } catch (error) {
    console.error('Error fetching storage locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch storage locations' },
      { status: 500 }
    )
  }
}

// POST /api/storage-locations - Create a new storage location
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, code, type, address, description } = body

    // Validate required fields
    if (!name || !code || !type) {
      return NextResponse.json(
        { error: 'Name, code, and type are required' },
        { status: 400 }
      )
    }

    // Check if name or code already exists
    const existing = await prisma.storageLocation.findFirst({
      where: {
        OR: [
          { name: name },
          { code: code }
        ]
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Storage location with this name or code already exists' },
        { status: 400 }
      )
    }

    const location = await prisma.storageLocation.create({
      data: {
        name,
        code: code.toUpperCase(),
        type,
        address: address || null,
        description: description || null,
      }
    })

    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    console.error('Error creating storage location:', error)
    return NextResponse.json(
      { error: 'Failed to create storage location' },
      { status: 500 }
    )
  }
}