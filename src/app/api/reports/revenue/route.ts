// TEMPORARILY DISABLED - NEEDS PRISMA REPLACEMENT
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'This report is temporarily disabled while migrating from Prisma' }, { status: 503 })
}
