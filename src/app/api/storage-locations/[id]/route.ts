import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PATCH /api/storage-locations/[id] - Update a storage location
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, code, type, address, description } = body

    // Validate required fields
    if (!name || !code || !type) {
      return NextResponse.json(
        { error: 'Name, code, and type are required' },
        { status: 400 }
      )
    }

    // Check if name or code already exists (excluding current location)
    const existing = await prisma.storageLocation.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              { name: name },
              { code: code }
            ]
          }
        ]
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Storage location with this name or code already exists' },
        { status: 400 }
      )
    }

    const location = await prisma.storageLocation.update({
      where: { id },
      data: {
        name,
        code: code.toUpperCase(),
        type,
        address: address || null,
        description: description || null,
      }
    })

    return NextResponse.json(location)
  } catch (error) {
    console.error('Error updating storage location:', error)
    return NextResponse.json(
      { error: 'Failed to update storage location' },
      { status: 500 }
    )
  }
}

// DELETE /api/storage-locations/[id] - Delete a storage location
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check if location has any stock records
    const stockCount = await prisma.materialStockLocation.count({
      where: { locationId: id }
    })

    if (stockCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location that has stock records. Please transfer or remove all stock first.' },
        { status: 400 }
      )
    }

    await prisma.storageLocation.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Storage location deleted successfully' })
  } catch (error) {
    console.error('Error deleting storage location:', error)
    return NextResponse.json(
      { error: 'Failed to delete storage location' },
      { status: 500 }
    )
  }
}