import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const { migration } = await request.json()
    
    if (!migration) {
      return NextResponse.json({ error: 'Migration name required' }, { status: 400 })
    }

    const migrationPath = join(process.cwd(), 'src', 'lib', 'db-migrations', `create-${migration}.sql`)
    const sql = readFileSync(migrationPath, 'utf8')

    await query(sql)

    return NextResponse.json({ 
      success: true, 
      message: `Migration ${migration} executed successfully` 
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}