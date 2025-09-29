import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

const ENUM_DEFINITIONS = [
  { name: 'ChangeOrderStatus', values: ['PENDING', 'APPROVED', 'REJECTED'] },
  { name: 'InvoiceStatus', values: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'] },
  { name: 'JobPhaseName', values: ['UG', 'RI', 'FN'] },
  { name: 'JobStatus', values: ['ESTIMATE', 'SCHEDULED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'BILLED', 'CANCELLED'] },
  { name: 'JobType', values: ['SERVICE_CALL', 'COMMERCIAL_PROJECT', 'INSTALLATION'] },
  { name: 'LeadSource', values: ['WEBSITE', 'REFERRAL', 'GOOGLE_ADS', 'FACEBOOK', 'YELLOW_PAGES', 'WORD_OF_MOUTH', 'REPEAT_CUSTOMER', 'OTHER'] },
  { name: 'LeadStatus', values: ['COLD_LEAD', 'WARM_LEAD', 'ESTIMATE_REQUESTED', 'ESTIMATE_SENT', 'ESTIMATE_APPROVED', 'JOB_SCHEDULED', 'JOB_IN_PROGRESS', 'JOB_COMPLETED', 'INVOICED', 'PAID', 'LOST', 'FOLLOW_UP_REQUIRED'] },
  { name: 'LocationType', values: ['WAREHOUSE', 'SHOP', 'TRUCK', 'OFFICE', 'SUPPLIER'] },
  { name: 'PhaseStatus', values: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] },
  { name: 'UserRole', values: ['ADMIN', 'OFFICE', 'FIELD_CREW'] },
  { name: 'break_type', values: ['LUNCH', 'SHORT_BREAK', 'PERSONAL', 'MEETING', 'TRAVEL', 'OTHER'] },
  { name: 'service_call_status', values: ['NEW', 'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ON_SITE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BILLED'] },
  { name: 'service_call_type', values: ['EMERGENCY', 'ROUTINE', 'SCHEDULED', 'CALLBACK', 'WARRANTY', 'MAINTENANCE'] },
  { name: 'service_priority', values: ['LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY'] },
  { name: 'time_entry_status', values: ['ACTIVE', 'COMPLETED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID'] },
  { name: 'user_role', values: ['OWNER', 'ADMIN', 'OFFICE', 'TECHNICIAN', 'VIEWER', 'OWNER_ADMIN', 'FOREMAN', 'EMPLOYEE'] },
];

export async function POST() {
  const created = [];
  const failed = [];
  
  try {
    for (const enumDef of ENUM_DEFINITIONS) {
      try {
        // Check if type already exists
        const checkResult = await query(`
          SELECT EXISTS (
            SELECT 1 FROM pg_type t 
            JOIN pg_namespace n ON n.oid = t.typnamespace 
            WHERE n.nspname = 'public' 
            AND t.typname = $1
          ) as exists
        `, [enumDef.name.toLowerCase()]);
        
        if (!checkResult.rows[0].exists) {
          // Create the enum type
          const valuesList = enumDef.values.map(v => `'${v}'`).join(', ');
          await query(`CREATE TYPE "${enumDef.name}" AS ENUM (${valuesList})`);
          created.push(enumDef.name);
        } else {
          // Type already exists, ensure all values are present
          for (const value of enumDef.values) {
            try {
              await query(`ALTER TYPE "${enumDef.name}" ADD VALUE IF NOT EXISTS '${value}'`);
            } catch (e) {
              // Value might already exist, ignore
            }
          }
          created.push(`${enumDef.name} (updated)`);
        }
      } catch (error: any) {
        failed.push({ 
          name: enumDef.name, 
          error: error.message 
        });
      }
    }
    
    // Also create sequences that were missing
    const sequences = [
      'CompanySettings_id_seq',
      'JobLaborRates_id_seq',
      'UserPermissions_id_seq',
      'UserNotificationSettings_id_seq',
      'UserAppearanceSettings_id_seq',
      'UserSecuritySettings_id_seq',
      'UserAuditLog_id_seq',
      'RoleHierarchy_id_seq'
    ];
    
    for (const seq of sequences) {
      try {
        await query(`CREATE SEQUENCE IF NOT EXISTS "${seq}"`);
        created.push(`Sequence: ${seq}`);
      } catch (e) {
        // Ignore if exists
      }
    }
    
    return NextResponse.json({
      success: true,
      created,
      failed,
      summary: {
        enumsCreated: created.filter(c => !c.startsWith('Sequence')).length,
        sequencesCreated: created.filter(c => c.startsWith('Sequence')).length,
        failed: failed.length
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      created,
      failed
    }, { status: 500 });
  }
}