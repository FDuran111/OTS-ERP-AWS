import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all users (for crew assignment)
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        active: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}