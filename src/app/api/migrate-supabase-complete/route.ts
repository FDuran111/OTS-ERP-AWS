import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Parse connection URLs
function parseConnectionString(url: string) {
  // Remove query parameters for parsing
  const [baseUrl, queryString] = url.split('?');
  const match = baseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) throw new Error('Invalid connection string');
  return {
    user: match[1],
    password: decodeURIComponent(match[2]),
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
    ssl: queryString?.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  };
}

// Table migration order based on dependencies
const TABLE_ORDER = [
  // Core tables first (no dependencies)
  'User',
  'Customer',
  'Vendor',
  'StorageLocation',
  'LaborRate',
  'Crew',
  'CompanySettings',
  'RoleHierarchy',
  
  // Asset/Equipment tables
  'CompanyAsset',
  'Vehicle',
  'Warehouse',
  'EquipmentRate',
  
  // Job related core tables
  'JobCategory',
  'JobSubCategory',
  'ServiceType',
  'JobTag',
  'ServiceTemplate',
  
  // Main Job table and related
  'Job',
  'JobPhase',
  'JobPhaseDetail',
  'JobSchedule',
  'JobAssignment',
  'JobNote',
  'JobReminder',
  
  // Material/Inventory
  'Material',
  'MaterialStockLocation',
  'MaterialReservation',
  'StockMovement',
  
  // File management
  'FileAttachment',
  'JobAttachment',
  'MaterialAttachment',
  'CustomerAttachment',
  
  // Time/Labor tracking
  'TimeEntry',
  'TimeEntryBreak',
  'JobLaborRates',
  'JobLaborCost',
  'JobLaborActual',
  'EmployeeSchedule',
  'EmployeeOverhead',
  
  // Equipment usage
  'EquipmentUsage',
  'EquipmentTimeLog',
  'EquipmentMaintenance',
  'AssetAssignment',
  
  // Cost tracking
  'JobMaterialCost',
  'JobEquipmentCost',
  'JobCost',
  
  // Crew management
  'CrewMember',
  'CrewAssignment',
  
  // Purchase/Invoice
  'PurchaseOrder',
  'PurchaseOrderItem',
  'PurchaseOrderRequirement',
  'Invoice',
  'InvoiceLineItem',
  
  // Change management
  'ChangeOrder',
  'MaterialUsage',
  
  // Service management
  'ServiceCall',
  'ServiceCallHistory',
  'ServiceCallMaterial',
  'ServiceCallChecklist',
  'ServiceCallAttachment',
  'ServiceSchedule',
  
  // Lead management
  'Lead',
  'LeadActivity',
  'LeadEstimate',
  
  // Customer portal
  'CustomerPortalUser',
  'CustomerPortalSession',
  'CustomerPortalPreferences',
  'CustomerAuth',
  'CustomerSession',
  'CustomerPortalSettings',
  'CustomerNotification',
  'CustomerMessage',
  'CustomerFeedback',
  'CustomerActivity',
  
  // User settings
  'UserSession',
  'UserPermissions',
  'UserNotificationSettings',
  'UserAppearanceSettings',
  'UserSecuritySettings',
  'UserAuditLog',
  
  // Route optimization
  'ServiceArea',
  'RouteTemplate',
  'Route',
  'RouteStop',
  'RouteOptimizationSettings',
  'TravelMatrix',
  
  // QuickBooks integration
  'QuickBooksConnection',
  'QuickBooksAccount',
  'QuickBooksItem',
  'QuickBooksMapping',
  'QuickBooksSyncConfig',
  'QuickBooksSyncLog',
  'QuickBooksWebhook',
  
  // Audit/Logging (last)
  'AuditLog',
  'JobTagAssignment'
];

export async function POST(request: NextRequest) {
  let sourcePool: Pool | null = null;
  let destPool: Pool | null = null;
  
  try {
    const { sourceUrl, destUrl, password } = await request.json();
    
    if (!sourceUrl || !destUrl) {
      return NextResponse.json({
        success: false,
        error: 'Missing source or destination URL'
      }, { status: 400 });
    }
    
    // Build source URL with password
    const fullSourceUrl = sourceUrl.replace('[YOUR-PASSWORD]', password || 'tucbE1-dumqap-cynpyx');
    
    // Parse connection details
    const sourceConfig = parseConnectionString(fullSourceUrl);
    const destConfig = parseConnectionString(destUrl);
    
    // Create connection pools
    sourcePool = new Pool({
      user: sourceConfig.user,
      password: sourceConfig.password,
      host: sourceConfig.host,
      port: sourceConfig.port,
      database: sourceConfig.database,
      ssl: sourceConfig.ssl || { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 30000
    });
    
    destPool = new Pool({
      user: destConfig.user,
      password: destConfig.password,
      host: destConfig.host,
      port: destConfig.port,
      database: destConfig.database,
      ssl: destConfig.ssl || { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 30000
    });
    
    // Test connections
    await sourcePool.query('SELECT 1');
    await destPool.query('SELECT 1');
    
    const results = {
      migrated: [] as string[],
      failed: [] as { table: string; error: string }[],
      skipped: [] as string[],
      totalRows: 0
    };
    
    // Disable foreign key checks temporarily
    await destPool.query('SET session_replication_role = replica;');
    
    for (const tableName of TABLE_ORDER) {
      try {
        // Check if table exists in source
        const sourceExists = await sourcePool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [tableName]);
        
        if (!sourceExists.rows[0].exists) {
          results.skipped.push(tableName);
          continue;
        }
        
        // Check if table exists in destination
        const destExists = await destPool.query(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [tableName]);
        
        if (!destExists.rows[0].exists) {
          // Create table structure
          const createTableQuery = await sourcePool.query(`
            SELECT 
              'CREATE TABLE IF NOT EXISTS public."' || table_name || '" (' ||
              string_agg(
                '"' || column_name || '" ' || 
                CASE 
                  WHEN data_type = 'USER-DEFINED' THEN udt_name
                  WHEN data_type = 'ARRAY' THEN 'TEXT[]'
                  ELSE data_type
                END ||
                CASE 
                  WHEN character_maximum_length IS NOT NULL 
                  THEN '(' || character_maximum_length || ')'
                  ELSE ''
                END ||
                CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                CASE 
                  WHEN column_default IS NOT NULL 
                  THEN ' DEFAULT ' || column_default
                  ELSE ''
                END,
                ', '
              ) || 
              ')' as create_statement
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = $1
            GROUP BY table_name
          `, [tableName]);
          
          if (createTableQuery.rows[0]) {
            await destPool.query(createTableQuery.rows[0].create_statement);
          }
        }
        
        // Get row count
        const countResult = await sourcePool.query(
          `SELECT COUNT(*) as count FROM public."${tableName}"`
        );
        const rowCount = parseInt(countResult.rows[0].count);
        
        if (rowCount === 0) {
          results.skipped.push(`${tableName} (empty)`);
          continue;
        }
        
        // Get all columns
        const columnsResult = await sourcePool.query(`
          SELECT column_name 
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        const columns = columnsResult.rows.map(r => `"${r.column_name}"`);
        const columnNames = columns.join(', ');
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        // Fetch data in batches
        const batchSize = 1000;
        let offset = 0;
        let migratedRows = 0;
        
        while (offset < rowCount) {
          const dataResult = await sourcePool.query(
            `SELECT * FROM public."${tableName}" LIMIT $1 OFFSET $2`,
            [batchSize, offset]
          );
          
          // Insert batch
          for (const row of dataResult.rows) {
            try {
              const values = columns.map(col => {
                const colName = col.replace(/"/g, '');
                const value = row[colName];
                // Handle arrays and special types
                if (Array.isArray(value)) {
                  return `{${value.join(',')}}`;
                }
                return value;
              });
              
              await destPool.query(
                `INSERT INTO public."${tableName}" (${columnNames}) 
                 VALUES (${placeholders})
                 ON CONFLICT DO NOTHING`,
                values
              );
              migratedRows++;
            } catch (insertError: any) {
              console.error(`Error inserting row in ${tableName}:`, insertError.message);
            }
          }
          
          offset += batchSize;
        }
        
        results.migrated.push(`${tableName} (${migratedRows} rows)`);
        results.totalRows += migratedRows;
        
      } catch (error: any) {
        console.error(`Error migrating ${tableName}:`, error);
        results.failed.push({
          table: tableName,
          error: error.message
        });
      }
    }
    
    // Re-enable foreign key checks
    await destPool.query('SET session_replication_role = DEFAULT;');
    
    // Update sequences for tables with serial columns
    const sequenceUpdates = await destPool.query(`
      SELECT 
        'SELECT setval(''' || sequence_name || ''', COALESCE((SELECT MAX(' || 
        column_name || ') FROM ' || table_name || '), 1))' as update_query
      FROM information_schema.columns c
      JOIN information_schema.sequences s ON s.sequence_name LIKE '%' || c.table_name || '%'
      WHERE c.table_schema = 'public'
      AND c.column_default LIKE 'nextval%'
    `);
    
    for (const row of sequenceUpdates.rows) {
      try {
        await destPool.query(row.update_query);
      } catch (e) {
        console.error('Error updating sequence:', e);
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        tablesProcessed: TABLE_ORDER.length,
        tablesMigrated: results.migrated.length,
        tablesFailed: results.failed.length,
        tablesSkipped: results.skipped.length,
        totalRowsMigrated: results.totalRows
      }
    });
    
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
    
  } finally {
    if (sourcePool) await sourcePool.end();
    if (destPool) await destPool.end();
  }
}