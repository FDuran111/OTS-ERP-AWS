import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Check for custom enum types
    const result = await query(`
      SELECT 
        t.typname AS enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
      FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      LEFT JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE n.nspname = 'public' 
        AND t.typtype = 'e'
      GROUP BY t.typname
      ORDER BY t.typname
    `);
    
    return NextResponse.json({
      success: true,
      enumCount: result.rows.length,
      enums: result.rows
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}