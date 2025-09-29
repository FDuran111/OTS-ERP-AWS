import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Check schema of both tables
    const userSchema = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'User'
      ORDER BY ordinal_position
    `);
    
    const usersSchema = await query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    // Get sample data from User table
    const userData = await query('SELECT * FROM "User" LIMIT 2');
    
    return NextResponse.json({
      User_table_schema: userSchema.rows,
      users_table_schema: usersSchema.rows,
      User_sample_data: userData.rows,
      message: 'Schema check complete'
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      detail: error.detail || 'No details'
    }, { status: 500 });
  }
}