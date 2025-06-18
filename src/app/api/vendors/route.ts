import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// GET all vendors
export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { active: true },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(vendors)
  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}

// POST create new vendor
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, code, contactName, email, phone, address } = body

    // Check if vendor code already exists
    const existingVendor = await prisma.vendor.findUnique({
      where: { code }
    })

    if (existingVendor) {
      return NextResponse.json(
        { error: 'Vendor code already exists' },
        { status: 400 }
      )
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        code,
        contactName,
        email,
        phone,
        address,
        active: true,
      }
    })

    return NextResponse.json(vendor, { status: 201 })
  } catch (error) {
    console.error('Error creating vendor:', error)
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    )
  }
}