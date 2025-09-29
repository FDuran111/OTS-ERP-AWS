import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Check both table names
    const usersLowercase = await query('SELECT email, name, role FROM "User" LIMIT 5');
    
    let usersCapitalized = { rows: [] };
    try {
      usersCapitalized = await query('SELECT email, name, role FROM "User" LIMIT 5');
    } catch (e) {
      // Table might not exist
    }
    
    return NextResponse.json({
      users_table: usersLowercase.rows,
      User_table: usersCapitalized.rows,
      message: 'Table check complete'
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      detail: error.detail || 'No details'
    }, { status: 500 });
  }
}