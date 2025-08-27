# Schema Readiness Assessment

## Tables Overview

Based on migration files in `/src/lib/db-migrations/`:

### Core Tables
- **User** - User authentication and roles (RBAC system)
- **Customer** - Customer information
- **Job** - Job management with phases and tracking
- **Material** - Material inventory
- **Lead** - Sales leads
- **Invoice** - Billing and invoicing
- **InvoiceLineItem** - Invoice details
- **TimeEntry** - Time tracking records

### Supporting Tables
- **FileAttachment** - File upload metadata
- **JobCategory** / **JobSubcategory** - Job classification
- **JobPhase** - Job phase tracking
- **JobCost** / **JobCostLabor** / **JobCostMaterial** / **JobCostEquipment** - Cost tracking
- **LaborRate** / **JobLaborRate** - Labor rate management
- **MaterialUsage** / **MaterialReservation** - Material tracking
- **PurchaseOrder** / **PurchaseOrderItem** - Purchasing
- **ServiceCall** - Service request management
- **Equipment** / **EquipmentBillingRate** - Equipment management
- **RouteOptimization** / **RouteVehicle** / **RouteStop** - Route planning
- **Settings** - Application settings
- **QuickBooksIntegration** - QB sync tracking

### Key Foreign Keys
- Jobs → Customer (customer_id)
- TimeEntry → User (user_id) & Job (job_id)
- Invoice → Customer (customer_id) & Job (job_id)
- MaterialUsage → Job (job_id) & Material (material_id)
- JobCost tables → Job (job_id)
- PurchaseOrder → User (created_by)

### Key Indexes
- Job: job_number (unique), customer_id, status
- User: email (unique), role
- Customer: email, phone
- Material: code (unique), category
- TimeEntry: user_id, job_id, clock_in

## Required PostgreSQL Extensions

```sql
-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions (for password hashing if needed)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

## Supabase-Only Features to Address

1. **RPC Functions**: Currently using Supabase RPC for raw SQL execution
   - Solution: Use direct pg pool queries instead
   
2. **Row Level Security (RLS)**: Not actively used but may be referenced
   - Solution: Handle authorization in application layer

3. **Realtime subscriptions**: Not found in current codebase
   - No action needed

4. **Auth system**: Using custom JWT, not Supabase Auth
   - No changes needed

## Replay Plan for Fresh RDS

### Step 1: Create Database and Extensions
```sql
CREATE DATABASE ortmeier;
\c ortmeier;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

### Step 2: Run Core Schema Migrations (in order)
1. `create-rbac-system.sql` - User roles and permissions
2. `create-time-tracking.sql` - Time tracking tables
3. `create-job-categorization.sql` - Job classification
4. `create-job-costs.sql` - Cost tracking
5. `create-labor-rates.sql` - Labor rate management
6. `create-material-usage.sql` - Material tracking
7. `create-material-reservations.sql` - Material reservations
8. `create-inventory-management.sql` - Inventory system
9. `create-purchase-orders.sql` - Purchase orders
10. `create-service-calls.sql` - Service calls
11. `create-equipment-billing.sql` - Equipment management
12. `create-route-optimization.sql` - Route planning
13. `create-quickbooks-integration.sql` - QB sync
14. `create-settings.sql` - App settings
15. `create-picture-upload.sql` - File attachments
16. `create-bid-sheet.sql` - Bid sheets
17. `create-employee-overhead.sql` - Employee overhead

### Step 3: Run Update Migrations
1. `update-job-types.sql` - Job type updates
2. `update-job-costs-true-cost.sql` - Cost calculation updates
3. `update-job-costs-labor-rate-overrides.sql` - Labor rate overrides
4. `update-file-urls.sql` - File URL updates
5. `integrate-equipment-billing.sql` - Equipment billing integration
6. `fix-get-available-crew-roles.sql` - Function fixes

### Step 4: Create Indexes and Constraints
- All migrations include their own indexes
- Foreign key constraints are defined in table creation

### Step 5: Initial Data Seed
```sql
-- Create default admin user
INSERT INTO "User" (email, password, name, role, active)
VALUES ('admin@ortmeier.com', '$2b$12$...', 'Admin', 'OWNER_ADMIN', true);

-- Create default settings
INSERT INTO "Settings" (key, value, category)
VALUES 
  ('company_name', 'Ortmeier Technical Service', 'company'),
  ('default_tax_rate', '0.0875', 'billing'),
  ('time_zone', 'America/Chicago', 'system');
```

## Gaps/Unknowns

1. **Base Tables Creation**: Need to verify if base tables (User, Customer, Job, Material, etc.) are created by a primary migration file or if they're expected to exist
   - Action: May need to create `create-base-tables.sql` migration

2. **Migration Order Dependencies**: Some migrations may depend on others
   - Solution: Use migration-runner.ts to handle dependencies

3. **Data Types**: Ensure all PostgreSQL data types are compatible with RDS
   - All standard types found (uuid, text, varchar, integer, decimal, timestamp, boolean, jsonb)

4. **Stored Procedures/Functions**: Several custom functions defined
   - `get_available_crew()` - Crew availability
   - Need to ensure all are created in correct order

5. **Enum Types**: Custom enums for roles and statuses
   - `user_role_new` enum defined in RBAC migration
   - Job status enums may need definition

6. **Triggers**: No database triggers found (good for portability)

## RDS-Specific Considerations

1. **Connection Pooling**: Use RDS Proxy for connection management
2. **SSL/TLS**: Enforce SSL connections with `sslmode=require`
3. **Parameter Groups**: May need custom parameter group for extensions
4. **Backup Strategy**: Configure automated backups
5. **Multi-AZ**: Consider for production high availability

## DB Driver Migration Status

### Current Implementation
The database layer (`src/lib/db.ts`) now supports dual-mode operation:

1. **SUPABASE Mode** (Default):
   - Uses `DATABASE_URL` connection string
   - Compatible with existing Supabase PostgreSQL
   - 30-second timeouts for connection and idle
   - No changes required for existing deployments

2. **RDS Mode**:
   - Uses explicit configuration parameters
   - Connects via RDS Proxy endpoint
   - SSL enforced with certificate validation
   - Optimized timeouts for RDS Proxy (10s idle, 5s connection)
   - Required environment variables:
     - `DB_DRIVER=RDS`
     - `RDS_PROXY_ENDPOINT`
     - `RDS_DB`
     - `RDS_USER`
     - `RDS_PASSWORD`

### Health Check Integration
- `/api/health` endpoint now reports database driver type
- `healthCheck()` function exported from `db.ts`
- Returns driver information in health status

### Migration Path
1. Keep `DB_DRIVER=SUPABASE` during initial deployment
2. Set up RDS with schema migrations
3. Test with `DB_DRIVER=RDS` in staging
4. Switch production after validation