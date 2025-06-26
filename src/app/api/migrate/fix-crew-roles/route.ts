import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    // First check if function exists
    const checkFunction = await query(`
      SELECT 
        p.proname as function_name,
        pg_get_function_result(p.oid) as return_type,
        pg_get_functiondef(p.oid) as definition
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'get_available_crew'
      AND n.nspname = 'public'
    `, [])
    
    if (checkFunction.rows.length > 0) {
      console.log('Current function definition:', checkFunction.rows[0])
    }
    
    // Drop the existing function with CASCADE to handle dependencies
    const dropFunctionSQL = `DROP FUNCTION IF EXISTS get_available_crew CASCADE`;
    await query(dropFunctionSQL, [])
    
    // Create the function with new roles
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION get_available_crew(
        p_start_date TIMESTAMP WITH TIME ZONE,
        p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
      ) RETURNS TABLE (
        user_id TEXT,
        user_name TEXT,
        user_email TEXT,
        user_role TEXT,
        conflicts INTEGER
      ) AS $$
      BEGIN
        -- Default end date to same day if not provided
        IF p_end_date IS NULL THEN
          p_end_date := p_start_date + INTERVAL '1 day';
        END IF;
        
        RETURN QUERY
        SELECT 
          u.id::TEXT,
          u.name::TEXT,
          u.email::TEXT,
          u.role::TEXT,
          COUNT(ca.id)::INTEGER as conflicts
        FROM "User" u
        LEFT JOIN "CrewAssignment" ca ON u.id = ca."userId"
        LEFT JOIN "JobSchedule" js ON ca."scheduleId" = js.id
          AND js."startDate" < p_end_date
          AND (js."endDate" IS NULL OR js."endDate" > p_start_date)
          AND js.status IN ('SCHEDULED', 'IN_PROGRESS')
          AND ca.status = 'ASSIGNED'
        WHERE u.role IN ('OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE')
          AND u.active = TRUE
        GROUP BY u.id, u.name, u.email, u.role
        ORDER BY conflicts ASC, u.name ASC;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await query(createFunctionSQL, [])
    
    // Test the function
    const testResult = await query(`
      SELECT * FROM get_available_crew(NOW()::timestamp, (NOW() + INTERVAL '1 day')::timestamp)
    `, [])
    
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully updated get_available_crew function to use new roles',
      availableCrewCount: testResult.rows.length,
      availableCrew: testResult.rows 
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}