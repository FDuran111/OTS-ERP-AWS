# Production Database Migration Plan
## Synchronizing AWS RDS with Local Development Schema

**Date:** October 6, 2025
**Target:** Make AWS RDS Production database match Local Development database
**Risk Level:** HIGH - Contains breaking changes and data migrations

---

## Executive Summary

This plan outlines the migration strategy to synchronize the AWS RDS production database with the local development database. The migration includes:

- **29 new tables** to be created
- **44 new triggers** to be created
- **9 tables** with schema changes (columns added/removed/modified)
- **Critical data type changes** requiring careful migration
- **Active features** dependent on these changes

---

## Pre-Migration Assessment

### Current State
- **AWS RDS:** 100 tables, 52 triggers, 5 time entries, 9 users, 36 jobs, 20 customers
- **Local DB:** 129 tables, 96 triggers
- **Production Data:** Minimal but LIVE production data exists

### Key Risks Identified

#### 🔴 CRITICAL RISKS
1. **Data Loss Potential:** RDS columns that don't exist in Local will be dropped
2. **Type Mismatches:** UUID ↔ TEXT conversions could fail
3. **Application Downtime:** Breaking changes require app redeployment
4. **Foreign Key Constraints:** Must maintain referential integrity

#### 🟡 MEDIUM RISKS
1. **Role/Permission System:** Production has no RBAC tables yet
2. **Time Entry Features:** Rejection workflow missing in RDS
3. **Accounting System:** Complete module missing in RDS

#### 🟢 LOW RISKS
1. **No Foreign Key Blockers:** No existing RDS tables reference missing tables
2. **Minimal RDS Data:** Only 5 time entries, easy to migrate
3. **S3 Columns Empty:** No data in columns that will be dropped

---

## What Will Be Affected

### 1. Applications & Features That Will BREAK Without Migration

#### Critical - App Won't Start
- **Roles & Permissions System** (105 code files)
  - `/src/components/settings/RolePermissions.tsx`
  - `/src/app/api/rbac/*` (6 API routes)
  - `/src/lib/auth.ts`, `/src/lib/rbac-middleware.ts`
  - **Impact:** Authentication and authorization will fail

#### High Priority - Features Won't Work
- **Time Entry Rejection Workflow** (7 code files)
  - `/src/app/api/time-entries/[id]/reject/route.ts`
  - `/src/app/api/time-entries/[id]/rejection-notes/route.ts`
  - `/src/components/time/RejectionFixDialog.tsx`
  - **Impact:** Cannot reject/fix time entries (recent feature)

- **Time Entry Photos** (1 code file)
  - `/src/app/api/time-entries/[id]/photos/route.ts`
  - **Impact:** Photo uploads will fail

- **Stock Transfers** (3 code files)
  - `/src/app/api/stock-transfers/*`
  - **Impact:** Inventory transfers won't work

- **Accounting Module** (20 code files)
  - `/src/app/(app)/accounting/*` (4 pages)
  - `/src/app/api/accounting/*` (9 API routes)
  - **Impact:** Entire accounting section inaccessible

### 2. Data That Will Be Lost (If Not Preserved)

#### ⚠️ RDS Columns That Will Be DROPPED
**FileAttachment table:**
- `cdnurl`, `s3bucket`, `s3key` (all NULL in production - SAFE)

**JobAttachment table:**
- `s3bucket`, `s3key` (will be dropped)

**OvertimeSettings table (2 rows exist):**
- `autoCalculateOvertime`
- `dailyRegularHours`
- `doubleTimeMultiplier`
- `overtimeMode`
- `overtimeMultiplier`
- `payPeriodType`
- `weekStartDay`
- `weeklyRegularHours`
- **ACTION REQUIRED:** Backup these 2 rows before migration!

**TimeEntry table (5 entries exist):**
- `editapprovedat`, `editapprovedby`, `editrequest`, `editrequestedat` (all NULL - SAFE)

**TimeTrackingSettings table:**
- `allowgpstracking`, `autoclockoutafterhours`, `breakdeductionminutes`
- `companyid`, `createdat`, `updatedat`, `overtimethreshold`
- `requirephotocheckin`, `roundtonearestminutes`, `maxdailyhours`
- **ACTION REQUIRED:** Backup existing settings!

### 3. Data That Needs to Be Migrated

#### Must Migrate (Has Data in Local)
1. **Role system** (8 roles) - Core RBAC
2. **RoleAssignment** (1 assignment) - User → Role mapping
3. **TimeEntryRejectionNote** (9 notes) - Active rejection data
4. **OvertimeSettings** (2 rows from RDS need to be preserved + merged with local structure)

#### Optional (No data yet, but tables needed)
- Permission tables (0 records but required by code)
- Material management tables (code exists, no data)
- Accounting tables (code exists, no data)

---

## Migration Strategy

### Phase 1: Pre-Migration Backup & Validation (30 min)

#### Step 1.1: Create Complete RDS Backup
```bash
# Full database backup
pg_dump "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -F custom -f rds_backup_$(date +%Y%m%d_%H%M%S).dump

# Backup critical tables
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -c "\COPY \"OvertimeSettings\" TO 'overtime_backup.csv' CSV HEADER"
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -c "\COPY \"TimeEntry\" TO 'timeentry_backup.csv' CSV HEADER"
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -c "\COPY \"User\" TO 'user_backup.csv' CSV HEADER"
```

#### Step 1.2: Validate Local Database
```bash
# Ensure local DB has all expected tables and triggers
psql "postgresql://localhost/ots_erp_local" -c "\dt" | wc -l  # Should be 129
psql "postgresql://localhost/ots_erp_local" -c "SELECT COUNT(*) FROM information_schema.triggers;"  # Should be 96
```

#### Step 1.3: Export Local Schema
```bash
# Generate complete schema (tables, indexes, triggers, functions)
pg_dump "postgresql://localhost/ots_erp_local" \
  --schema-only \
  -f local_schema_$(date +%Y%m%d_%H%M%S).sql
```

---

### Phase 2: Data Preservation (15 min)

#### Step 2.1: Extract RDS Data That Will Be Lost
```sql
-- Save OvertimeSettings data
CREATE TEMP TABLE overtime_settings_backup AS
SELECT * FROM "OvertimeSettings";

-- Save TimeTrackingSettings lowercase columns
CREATE TEMP TABLE timetracking_backup AS
SELECT
  id,
  companyid as "companyId",
  createdat as "createdAt",
  updatedat as "updatedAt",
  overtimethreshold as "overtimeThreshold",
  allowgpstracking,
  autoclockoutafterhours,
  breakdeductionminutes,
  maxdailyhours,
  requirephotocheckin,
  roundtonearestminutes
FROM "TimeTrackingSettings";
```

#### Step 2.2: Validate Data Compatibility
```sql
-- Check TimeEntry.approvedBy can convert to UUID
SELECT COUNT(*) FROM "TimeEntry"
WHERE "approvedBy" IS NOT NULL
  AND "approvedBy" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
-- Should return 0

-- Check OvertimeSettings.id is valid UUID
SELECT COUNT(*) FROM "OvertimeSettings"
WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
-- Should return 0 (or convert TEXT to UUID)
```

---

### Phase 3: Schema Migration (45 min)

#### Step 3.1: Drop Existing Problematic Objects
```sql
-- Drop views that depend on tables we're modifying
DROP VIEW IF EXISTS "CategoryPerformanceView" CASCADE;
DROP VIEW IF EXISTS "CrewDailyHours" CASCADE;
DROP VIEW IF EXISTS "CustomerPhotoView" CASCADE;
-- ... (check for other views)

-- Drop triggers on tables we're modifying
-- (Will be recreated from local schema)
```

#### Step 3.2: Create Missing Tables (Phase 1 - Independent)
Execute in this order:
1. Account, AccountBalance, AccountingPeriod, AccountingSettings
2. Permission, PermissionGroup, PermissionGroupMember
3. Role, RolePermission, UserPermission
4. JournalEntry
5. MaterialCostHistory, MaterialDocument, MaterialKit, MaterialKitItem
6. MaterialLocationStock, MaterialVendorPrice
7. Notification, NotificationPreference
8. PurchaseOrderReceipt, ReceiptItem
9. StockTransfer, StockTransferItem
10. TimeEntryPhoto, TimeEntryRejectionNote
11. UserViewPreference
12. ForecastCache

**Script:** `src/lib/db-migrations/create-missing-tables-phase1.sql`

#### Step 3.3: Create Missing Tables (Phase 2 - Dependent)
1. RoleAssignment (depends on: Role)
2. JournalEntryLine (depends on: JournalEntry)

**Script:** `src/lib/db-migrations/create-missing-tables-phase2.sql`

#### Step 3.4: Modify Existing Tables
For each table with schema differences, execute ALTER TABLE commands:

**OvertimeSettings:**
```sql
-- Add missing columns (from Local)
ALTER TABLE "OvertimeSettings"
  ADD COLUMN IF NOT EXISTS "companyId" UUID,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "overtimeThreshold" NUMERIC;

-- Change id from TEXT to UUID (if needed)
ALTER TABLE "OvertimeSettings"
  ALTER COLUMN id TYPE UUID USING id::uuid;

-- Drop RDS-only columns (after backing up)
ALTER TABLE "OvertimeSettings"
  DROP COLUMN IF EXISTS autoCalculateOvertime,
  DROP COLUMN IF EXISTS dailyRegularHours,
  DROP COLUMN IF EXISTS doubleTimeMultiplier,
  DROP COLUMN IF EXISTS overtimeMode,
  DROP COLUMN IF EXISTS overtimeMultiplier,
  DROP COLUMN IF EXISTS payPeriodType,
  DROP COLUMN IF EXISTS weekStartDay,
  DROP COLUMN IF EXISTS weeklyRegularHours;
```

**TimeEntry:**
```sql
-- Add new columns
ALTER TABLE "TimeEntry"
  ADD COLUMN IF NOT EXISTS "hasRejectionNotes" BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "photoCount" INTEGER DEFAULT 0;

-- Change approvedBy from TEXT to UUID
ALTER TABLE "TimeEntry"
  ALTER COLUMN "approvedBy" TYPE UUID USING "approvedBy"::uuid;

-- Drop edit columns
ALTER TABLE "TimeEntry"
  DROP COLUMN IF EXISTS editapprovedat,
  DROP COLUMN IF EXISTS editapprovedby,
  DROP COLUMN IF EXISTS editrequest,
  DROP COLUMN IF EXISTS editrequestedat;
```

**TimeEntryAudit:**
```sql
-- Add new columns
ALTER TABLE "TimeEntryAudit"
  ADD COLUMN IF NOT EXISTS changes JSONB,
  ADD COLUMN IF NOT EXISTS correlation_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS job_labor_cost_id UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Type changes
ALTER TABLE "TimeEntryAudit"
  ALTER COLUMN action TYPE VARCHAR(50),
  ALTER COLUMN entry_id TYPE TEXT USING entry_id::text,
  ALTER COLUMN ip_address TYPE VARCHAR(45),
  ALTER COLUMN new_job_id TYPE UUID USING new_job_id::uuid,
  ALTER COLUMN old_job_id TYPE UUID USING old_job_id::uuid;
```

**JobLaborCost:**
```sql
ALTER TABLE "JobLaborCost"
  ALTER COLUMN "timeEntryId" TYPE TEXT USING "timeEntryId"::text;
```

**StockMovement:**
```sql
ALTER TABLE "StockMovement"
  ADD COLUMN IF NOT EXISTS "clientRequestId" TEXT,
  ADD COLUMN IF NOT EXISTS "transferId" TEXT;
```

**UserAuditLog:**
```sql
ALTER TABLE "UserAuditLog"
  ADD COLUMN IF NOT EXISTS "resourceId" TEXT,
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20);
```

**TimeTrackingSettings:**
```sql
-- Add camelCase columns
ALTER TABLE "TimeTrackingSettings"
  ADD COLUMN IF NOT EXISTS "companyId" UUID NOT NULL,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "overtimeThreshold" NUMERIC;

-- Drop lowercase columns
ALTER TABLE "TimeTrackingSettings"
  DROP COLUMN IF EXISTS companyid,
  DROP COLUMN IF EXISTS createdat,
  DROP COLUMN IF EXISTS updatedat,
  DROP COLUMN IF EXISTS overtimethreshold,
  DROP COLUMN IF EXISTS allowgpstracking,
  DROP COLUMN IF EXISTS autoclockoutafterhours,
  DROP COLUMN IF EXISTS breakdeductionminutes,
  DROP COLUMN IF EXISTS maxdailyhours,
  DROP COLUMN IF EXISTS requirephotocheckin,
  DROP COLUMN IF EXISTS roundtonearestminutes;
```

**Script:** `src/lib/db-migrations/alter-existing-tables.sql`

---

### Phase 4: Trigger Migration (20 min)

#### Step 4.1: Create Trigger Functions
Export all functions from local that triggers depend on:
```bash
pg_dump "postgresql://localhost/ots_erp_local" \
  --schema-only \
  --section=pre-data \
  -t 'pg_proc' \
  -f trigger_functions.sql
```

#### Step 4.2: Create Missing Triggers
Execute all 44 missing triggers in order:
1. Accounting triggers (9)
2. Material management triggers (12)
3. Permission/Role triggers (8)
4. Purchase order triggers (5)
5. Stock transfer triggers (2)
6. Time entry triggers (7)
7. Other triggers (1)

**Script:** `src/lib/db-migrations/create-missing-triggers.sql`

---

### Phase 5: Data Migration (30 min)

#### Step 5.1: Export Local Data
```bash
# Export Role system data
pg_dump "postgresql://localhost/ots_erp_local" \
  --data-only \
  --table="\"Role\"" \
  --table="\"Permission\"" \
  --table="\"RolePermission\"" \
  --table="\"RoleAssignment\"" \
  -f role_data.sql

# Export TimeEntryRejectionNote data
pg_dump "postgresql://localhost/ots_erp_local" \
  --data-only \
  --table="\"TimeEntryRejectionNote\"" \
  -f rejection_notes_data.sql
```

#### Step 5.2: Import to RDS
```bash
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -f role_data.sql

psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -f rejection_notes_data.sql
```

#### Step 5.3: Restore Preserved RDS Data
```sql
-- Merge OvertimeSettings if needed
-- (Manual review required to merge old structure with new)
```

---

### Phase 6: Validation & Testing (30 min)

#### Step 6.1: Schema Validation
```bash
# Re-run comparison to verify schemas match
python3 /tmp/compare_databases.py
# Should show: 0 missing tables, 0 missing triggers, 0 schema differences
```

#### Step 6.2: Data Integrity Checks
```sql
-- Verify foreign keys
SELECT COUNT(*) FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';
-- Should match local DB count

-- Verify triggers
SELECT COUNT(*) FROM information_schema.triggers;
-- Should be 96 (same as local)

-- Verify critical data
SELECT COUNT(*) FROM "Role";  -- Should be 8
SELECT COUNT(*) FROM "User";  -- Should be 9
SELECT COUNT(*) FROM "TimeEntry";  -- Should be 5
SELECT COUNT(*) FROM "TimeEntryRejectionNote";  -- Should be 9
```

#### Step 6.3: Application Testing
1. Deploy updated application to staging/test environment
2. Test authentication & authorization (roles/permissions)
3. Test time entry workflow (rejection, photos)
4. Test accounting module access
5. Test stock transfers
6. Run full regression test suite

---

### Phase 7: Application Deployment (20 min)

#### Step 7.1: Update Environment Variables
Ensure application knows about new schema:
```env
DATABASE_URL=<RDS connection string>
# No new env vars needed - schema changes only
```

#### Step 7.2: Deploy Application
```bash
# Build new Docker image with updated code
cd /Users/franciscoduran/Desktop/OTS-ERP
docker build -t ots-erp:latest .

# Push to ECR
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin <ecr-uri>
docker tag ots-erp:latest <ecr-uri>/ots-erp:latest
docker push <ecr-uri>/ots-erp:latest

# Update ECS service
aws ecs update-service \
  --cluster ots-erp-cluster \
  --service ots-erp-svc \
  --force-new-deployment \
  --region us-east-2
```

#### Step 7.3: Monitor Deployment
```bash
# Watch ECS task status
aws ecs describe-services \
  --cluster ots-erp-cluster \
  --services ots-erp-svc \
  --region us-east-2

# Check application logs
aws logs tail /ecs/ots-erp --follow
```

---

## Rollback Strategy

### If Migration Fails During Schema Changes

#### Option 1: Restore from Backup (Fastest)
```bash
# Restore complete database
pg_restore -d "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  --clean --if-exists \
  rds_backup_YYYYMMDD_HHMMSS.dump
```

**Time:** 5-10 minutes
**Data Loss:** Any changes made during migration

#### Option 2: Manual Rollback (If backup fails)
1. Drop all newly created tables
2. Re-add dropped columns using backup CSVs
3. Restore original triggers
4. Restore data from CSV backups

**Time:** 30-60 minutes
**Risk:** Manual process, error-prone

### If Migration Succeeds But Application Fails

#### Option 1: Rollback Application Only
```bash
# Deploy previous Docker image
aws ecs update-service \
  --cluster ots-erp-cluster \
  --service ots-erp-svc \
  --task-definition ots-erp:PREVIOUS_VERSION \
  --region us-east-2
```

**Time:** 5 minutes
**Note:** Database remains migrated, app returns to old version (may have compatibility issues)

#### Option 2: Full Rollback (Database + Application)
1. Restore database from backup (Option 1 above)
2. Rollback application deployment

**Time:** 15 minutes
**Clean State:** Both DB and app back to pre-migration state

---

## Migration Execution Checklist

### Pre-Migration (Do 24 hours before)
- [ ] Review this plan with team
- [ ] Schedule maintenance window (recommend 3-hour window)
- [ ] Notify users of downtime
- [ ] Verify backup procedures work
- [ ] Test rollback procedure on staging environment
- [ ] Prepare monitoring dashboards

### Maintenance Window Start
- [ ] Put application in maintenance mode
- [ ] Verify no active users
- [ ] Close all application connections to database

### Migration Execution
- [ ] Phase 1: Backup & Validation (30 min)
  - [ ] Create RDS backup
  - [ ] Export local schema
  - [ ] Validate schemas
- [ ] Phase 2: Data Preservation (15 min)
  - [ ] Backup OvertimeSettings
  - [ ] Backup TimeTrackingSettings
  - [ ] Validate data compatibility
- [ ] Phase 3: Schema Migration (45 min)
  - [ ] Create missing tables (Phase 1)
  - [ ] Create missing tables (Phase 2)
  - [ ] Alter existing tables
- [ ] Phase 4: Trigger Migration (20 min)
  - [ ] Create trigger functions
  - [ ] Create all missing triggers
- [ ] Phase 5: Data Migration (30 min)
  - [ ] Export local data
  - [ ] Import to RDS
  - [ ] Restore preserved data
- [ ] Phase 6: Validation (30 min)
  - [ ] Run schema comparison
  - [ ] Verify data integrity
  - [ ] Test database queries
- [ ] Phase 7: Application Deployment (20 min)
  - [ ] Deploy updated application
  - [ ] Monitor deployment
  - [ ] Run smoke tests

### Post-Migration
- [ ] Verify all features work
- [ ] Check application logs for errors
- [ ] Monitor performance metrics
- [ ] Test critical workflows:
  - [ ] Login with roles
  - [ ] Create/reject time entry
  - [ ] Upload time entry photo
  - [ ] Access accounting module
  - [ ] Create stock transfer
- [ ] Remove maintenance mode
- [ ] Notify users migration complete

### If Issues Occur
- [ ] Execute rollback plan
- [ ] Document issues encountered
- [ ] Schedule retry after fixes

---

## Problems That Will Arise & Solutions

### Problem 1: UUID vs TEXT Mismatches
**Tables Affected:** TimeEntry.approvedBy, OvertimeSettings.id, TimeEntryAudit (multiple columns)

**Why It Happens:** Local schema uses UUID, RDS uses TEXT (or vice versa)

**Solution:**
```sql
-- Validate all values are valid UUIDs first
SELECT column_name FROM table WHERE column !~ '^[0-9a-f]{8}-...$';

-- If all valid, cast:
ALTER TABLE table ALTER COLUMN column TYPE UUID USING column::uuid;

-- If invalid values found, fix or set to NULL first:
UPDATE table SET column = NULL WHERE column !~ '^[0-9a-f]{8}-...$';
```

**Prevention:** Test on copy of production data first

---

### Problem 2: Dropped Columns with Data (OvertimeSettings)
**Columns Being Dropped:** 8 columns including overtimeMode, overtimeMultiplier, etc.

**Why It Happens:** Local schema evolved differently than RDS

**Solution:**
1. Before migration: Export data to CSV/JSON
2. After migration: Manually map to new structure if needed
3. Alternative: Add columns to Local schema instead of dropping from RDS

**Recommendation:** Review with stakeholders if this data is needed

---

### Problem 3: Application Expects Tables That Don't Exist Yet
**Affected Features:** Roles, Permissions, Accounting, Time Entry Photos

**Why It Happens:** Code was developed against Local, RDS is behind

**Solution:**
- **During Migration:** Application MUST be down
- **After Migration:** Deploy updated app immediately
- **Never:** Run old app against new schema or new app against old schema

**Prevention:** Coordinated deployment (database → application)

---

### Problem 4: Foreign Key Violations During Data Migration
**Potential Scenario:** Importing RoleAssignment before Role table has data

**Why It Happens:** Incorrect migration order

**Solution:**
1. Always create parent tables first (Role before RoleAssignment)
2. Import parent data first (Role data before RoleAssignment data)
3. Use `--disable-triggers` if needed (careful!)
4. Validate constraints after import

**Prevention:** Follow Phase 1 → Phase 2 order strictly

---

### Problem 5: Trigger Functions Missing
**Error:** "function xyz() does not exist"

**Why It Happens:** Triggers reference functions that weren't created

**Solution:**
```bash
# Export ALL functions from local
pg_dump "postgresql://localhost/ots_erp_local" \
  --schema-only \
  | grep -A 50 "CREATE FUNCTION" \
  > all_functions.sql

# Import to RDS before creating triggers
psql "postgresql://..." -f all_functions.sql
```

**Prevention:** Always create functions before triggers

---

### Problem 6: Performance Degradation After Migration
**Possible Causes:** Missing indexes, outdated statistics

**Solution:**
```sql
-- Rebuild indexes
REINDEX DATABASE ortmeier;

-- Update statistics
ANALYZE;

-- Vacuum (if needed)
VACUUM ANALYZE;
```

**Prevention:** Include in post-migration checklist

---

### Problem 7: TimeTrackingSettings Column Name Conflicts
**Issue:** Both `companyid` and `companyId` can't coexist

**Solution:**
```sql
-- Migrate data from lowercase to camelCase first
UPDATE "TimeTrackingSettings"
SET "companyId" = companyid,
    "createdAt" = createdat,
    "updatedAt" = updatedat,
    "overtimeThreshold" = overtimethreshold
WHERE "companyId" IS NULL;

-- Then drop lowercase columns
ALTER TABLE "TimeTrackingSettings"
  DROP COLUMN companyid,
  DROP COLUMN createdat,
  DROP COLUMN updatedat,
  DROP COLUMN overtimethreshold;
```

---

## Success Criteria

Migration is successful when:

1. ✅ All 129 tables exist in RDS
2. ✅ All 96 triggers exist and function correctly
3. ✅ No schema differences between Local and RDS
4. ✅ All foreign key constraints valid
5. ✅ Application starts without errors
6. ✅ Authentication & authorization work (roles/permissions)
7. ✅ Time entry rejection workflow functions
8. ✅ Time entry photo uploads work
9. ✅ Accounting module accessible
10. ✅ Stock transfers functional
11. ✅ No data loss from critical tables
12. ✅ All smoke tests pass

---

## Timeline

**Total Estimated Time:** 3 hours (190 minutes)
- Pre-Migration Backup: 30 min
- Data Preservation: 15 min
- Schema Migration: 45 min
- Trigger Migration: 20 min
- Data Migration: 30 min
- Validation: 30 min
- Application Deployment: 20 min

**Recommended Window:** 4 hours (includes buffer)

**Best Time:** Weekend or late evening when usage is lowest

---

## Post-Migration Monitoring

### Week 1: Intensive Monitoring
- Check error logs daily
- Monitor query performance
- Track user-reported issues
- Verify all features working

### Week 2-4: Normal Monitoring
- Weekly log review
- Performance baseline comparison
- User feedback review

### Long-Term:
- Keep backups for 30 days minimum
- Document any issues encountered
- Update runbooks with lessons learned

---

## Next Steps

1. **Review this plan** with team and stakeholders
2. **Test migration** on a staging/test RDS instance first
3. **Generate all migration scripts** (SQL files referenced above)
4. **Schedule maintenance window**
5. **Prepare rollback procedure**
6. **Execute migration** following checklist
7. **Monitor and validate** post-migration

---

**Plan Prepared By:** Claude
**Review Required By:** Francisco Duran, Technical Team
**Approval Required Before Execution**
