import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    console.log('Seeding sample data...');
    
    // Insert sample customers
    await query(`
      INSERT INTO customers (id, company_name, first_name, last_name, email, phone)
      VALUES 
        ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'ABC Electric', 'John', 'Smith', 'john@abcelectric.com', '555-0101'),
        ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'XYZ Construction', 'Jane', 'Doe', 'jane@xyzcon.com', '555-0102'),
        ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'Tech Solutions Inc', 'Bob', 'Johnson', 'bob@techsol.com', '555-0103'),
        ('550e8400-e29b-41d4-a716-446655440004'::uuid, 'Green Energy Co', 'Alice', 'Williams', 'alice@greenenergy.com', '555-0104'),
        ('550e8400-e29b-41d4-a716-446655440005'::uuid, 'Industrial Services', 'Charlie', 'Brown', 'charlie@industrial.com', '555-0105')
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Insert sample jobs
    await query(`
      INSERT INTO jobs (id, job_number, customer_id, status)
      VALUES
        ('650e8400-e29b-41d4-a716-446655440001'::uuid, 'JOB-2025-001', '550e8400-e29b-41d4-a716-446655440001'::uuid, 'in_progress'),
        ('650e8400-e29b-41d4-a716-446655440002'::uuid, 'JOB-2025-002', '550e8400-e29b-41d4-a716-446655440002'::uuid, 'pending'),
        ('650e8400-e29b-41d4-a716-446655440003'::uuid, 'JOB-2025-003', '550e8400-e29b-41d4-a716-446655440003'::uuid, 'completed'),
        ('650e8400-e29b-41d4-a716-446655440004'::uuid, 'JOB-2025-004', '550e8400-e29b-41d4-a716-446655440004'::uuid, 'in_progress'),
        ('650e8400-e29b-41d4-a716-446655440005'::uuid, 'JOB-2025-005', '550e8400-e29b-41d4-a716-446655440005'::uuid, 'in_progress')
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Insert sample job phases
    await query(`
      INSERT INTO job_phases (id, job_id, name, status)
      VALUES
        ('750e8400-e29b-41d4-a716-446655440001'::uuid, '650e8400-e29b-41d4-a716-446655440001'::uuid, 'Site Preparation', 'completed'),
        ('750e8400-e29b-41d4-a716-446655440002'::uuid, '650e8400-e29b-41d4-a716-446655440001'::uuid, 'Electrical Installation', 'in_progress'),
        ('750e8400-e29b-41d4-a716-446655440003'::uuid, '650e8400-e29b-41d4-a716-446655440001'::uuid, 'Testing & Commissioning', 'pending'),
        ('750e8400-e29b-41d4-a716-446655440004'::uuid, '650e8400-e29b-41d4-a716-446655440002'::uuid, 'Planning & Design', 'pending'),
        ('750e8400-e29b-41d4-a716-446655440005'::uuid, '650e8400-e29b-41d4-a716-446655440002'::uuid, 'Procurement', 'pending'),
        ('750e8400-e29b-41d4-a716-446655440006'::uuid, '650e8400-e29b-41d4-a716-446655440003'::uuid, 'Final Inspection', 'completed'),
        ('750e8400-e29b-41d4-a716-446655440007'::uuid, '650e8400-e29b-41d4-a716-446655440003'::uuid, 'Documentation', 'completed'),
        ('750e8400-e29b-41d4-a716-446655440008'::uuid, '650e8400-e29b-41d4-a716-446655440004'::uuid, 'Panel Installation', 'in_progress'),
        ('750e8400-e29b-41d4-a716-446655440009'::uuid, '650e8400-e29b-41d4-a716-446655440004'::uuid, 'Wiring', 'pending'),
        ('750e8400-e29b-41d4-a716-446655440010'::uuid, '650e8400-e29b-41d4-a716-446655440005'::uuid, 'Equipment Setup', 'in_progress')
      ON CONFLICT (id) DO NOTHING
    `);
    
    // Get counts
    const customerCount = await query('SELECT COUNT(*) FROM customers');
    const jobCount = await query('SELECT COUNT(*) FROM jobs');
    const phaseCount = await query('SELECT COUNT(*) FROM job_phases');
    
    // Get some stats
    const activeJobs = await query(`
      SELECT COUNT(*) FROM jobs WHERE status = 'in_progress'
    `);
    
    const completedPhases = await query(`
      SELECT COUNT(*) FROM job_phases WHERE status = 'completed'
    `);
    
    const inProgressPhases = await query(`
      SELECT COUNT(*) FROM job_phases WHERE status = 'in_progress'
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Sample data seeded successfully',
      counts: {
        customers: customerCount.rows[0].count,
        jobs: jobCount.rows[0].count,
        job_phases: phaseCount.rows[0].count
      },
      stats: {
        activeJobs: activeJobs.rows[0].count,
        completedPhases: completedPhases.rows[0].count,
        inProgressPhases: inProgressPhases.rows[0].count
      }
    });
    
  } catch (error: any) {
    console.error('Error seeding data:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      detail: error.detail || 'No details'
    }, { status: 500 });
  }
}