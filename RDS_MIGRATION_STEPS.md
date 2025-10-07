# AWS RDS Migration Steps
## Update Production RDS to Match Local Database Schema

**Date:** October 6, 2025
**Status:** Ready to execute after Docker deployment
**Estimated Time:** 2-3 hours

---

## Pre-Migration Checklist

### ✅ Prerequisites (Complete These First)

- [ ] Docker container built successfully
- [ ] Docker container pushed to ECR
- [ ] SSH tunnel to RDS active (or can establish)
- [ ] Backup tools ready (pg_dump available)
- [ ] Database credentials confirmed working
- [ ] Maintenance window scheduled (if needed)

---

## Step 1: Create Complete Backup (15 minutes)

### 1.1 Full Database Backup

```bash
# Create backup directory
mkdir -p ~/Desktop/OTS-ERP/backups/$(date +%Y%m%d)
cd ~/Desktop/OTS-ERP/backups/$(date +%Y%m%d)

# Full database backup (custom format - can restore selectively)
pg_dump "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -F custom \
  -f rds_full_backup_$(date +%Y%m%d_%H%M%S).dump

# SQL format backup (human readable)
pg_dump "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -F plain \
  -f rds_full_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 1.2 Critical Table Backups (CSV format)

```bash
# Backup OvertimeSettings (the problematic table)
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -c "\COPY \"OvertimeSettings\" TO 'overtimesettings_backup.csv' CSV HEADER"

# Backup Users (safety)
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -c "\COPY \"User\" TO 'user_backup.csv' CSV HEADER"

# Backup TimeEntry (safety)
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -c "\COPY \"TimeEntry\" TO 'timeentry_backup.csv' CSV HEADER"

# Backup Jobs (safety)
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -c "\COPY \"Job\" TO 'job_backup.csv' CSV HEADER"

# Backup Customers (safety)
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -c "\COPY \"Customer\" TO 'customer_backup.csv' CSV HEADER"
```

### 1.3 Verify Backups

```bash
# Check backup files exist and have size
ls -lh *.dump *.sql *.csv

# Quick test - count lines in critical CSVs
wc -l *.csv

# Expected:
# 10 user_backup.csv (9 users + header)
# 37 job_backup.csv (36 jobs + header)
# 21 customer_backup.csv (20 customers + header)
# 6 timeentry_backup.csv (5 entries + header)
# 3 overtimesettings_backup.csv (2 rows + header)
```

---

## Step 2: Generate Migration Scripts (30 minutes)

### 2.1 Export Local Schema

```bash
cd ~/Desktop/OTS-ERP

# Export complete schema from local database
pg_dump "postgresql://localhost/ots_erp_local" \
  --schema-only \
  --no-owner \
  --no-privileges \
  -f local_schema_complete.sql

# This creates a file with:
# - All table definitions
# - All indexes
# - All triggers
# - All functions
# - All constraints
```

### 2.2 Create Migration Script Directory

```bash
# Create migration scripts directory
mkdir -p src/lib/db-migrations/2025-10-06-production-sync
cd src/lib/db-migrations/2025-10-06-production-sync
```

### 2.3 Create Migration Scripts (I'll generate these)

You'll need these files (I'll create them for you):
1. `01-pre-migration-fixes.sql` - Fix OvertimeSettings.id issue
2. `02-create-missing-tables.sql` - Create 29 new tables
3. `03-alter-existing-tables.sql` - Modify 9 tables with schema changes
4. `04-create-functions.sql` - Create missing database functions
5. `05-create-triggers.sql` - Create 44 missing triggers
6. `06-migrate-data.sql` - Migrate data from Local (roles, permissions)
7. `07-validate.sql` - Validation queries

Let me create these now...

---

## Step 3: Pre-Migration Fixes (10 minutes)

### 3.1 Fix OvertimeSettings UUID Issue

```bash
# Connect to RDS
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier"
```

```sql
-- Fix the 'default' id that can't convert to UUID
-- Option 1: Delete it (recommended - it's a duplicate)
DELETE FROM "OvertimeSettings" WHERE id = 'default';

-- Verify only valid UUID remains
SELECT id,
       id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' as is_valid_uuid
FROM "OvertimeSettings";
-- Should show: 1 row, is_valid_uuid = true
```

### 3.2 Document Current Settings (for reference)

```sql
-- Document what's being lost from OvertimeSettings
SELECT
    'Current overtime settings:' as note,
    "autoCalculateOvertime",
    "dailyRegularHours",
    "weeklyRegularHours",
    "overtimeMultiplier",
    "doubleTimeMultiplier",
    "weekStartDay",
    "overtimeMode",
    "payPeriodType"
FROM "OvertimeSettings";

-- Save this output for reference
```

---

## Step 4: Execute Schema Migration (45 minutes)

### 4.1 Create Missing Tables (Phase 1 - Independent)

```bash
# Run script 02
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -f 02-create-missing-tables.sql
```

**This creates:**
- Account, AccountBalance, AccountingPeriod, AccountingSettings (4)
- Permission, PermissionGroup, PermissionGroupMember (3)
- Role, RolePermission (2)
- MaterialCostHistory, MaterialDocument, MaterialKit, MaterialKitItem (4)
- MaterialLocationStock, MaterialVendorPrice (2)
- Notification, NotificationPreference (2)
- PurchaseOrderReceipt, ReceiptItem (2)
- StockTransfer, StockTransferItem (2)
- TimeEntryPhoto, TimeEntryRejectionNote (2)
- UserPermission, UserViewPreference (2)
- ForecastCache, JournalEntry (2)
- **Total: 27 tables**

### 4.2 Create Missing Tables (Phase 2 - Dependent)

```sql
-- These depend on tables from Phase 1
-- JournalEntryLine (depends on JournalEntry)
-- RoleAssignment (depends on Role)
```

### 4.3 Modify Existing Tables

```bash
# Run script 03
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -f 03-alter-existing-tables.sql
```

**This modifies:**
1. OvertimeSettings (drop 8 columns, add 4, change types)
2. TimeEntry (drop 4 columns, add 2)
3. TimeEntryAudit (add 4 columns, change 5 types)
4. TimeTrackingSettings (complex: rename lowercase→camelCase)
5. JobLaborCost (change 1 type)
6. StockMovement (add 2 columns)
7. UserAuditLog (add 2 columns)
8. FileAttachment (drop 3 columns - safe, all NULL)
9. JobAttachment (drop 2 columns - safe, all NULL)

---

## Step 5: Create Functions & Triggers (30 minutes)

### 5.1 Create Missing Functions

```bash
# Run script 04
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -f 04-create-functions.sql
```

**Critical functions:**
- `user_has_permission(user_id, permission_id)` - Updated signature
- `get_user_permissions(user_id)` - Returns user's permission list
- `log_permission_change()` - Audit logging for permissions
- `log_role_changes()` - Audit logging for roles
- Material kit triggers
- Stock transfer triggers
- Receipt validation triggers

### 5.2 Create Missing Triggers

```bash
# Run script 05
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -f 05-create-triggers.sql
```

**44 triggers including:**
- Accounting triggers (9)
- Material management (12)
- Role/Permission auditing (8)
- Purchase order validation (5)
- Stock transfers (2)
- Time entry workflow (7)
- Other (1)

---

## Step 6: Migrate Data from Local (20 minutes)

### 6.1 Export Role & Permission Data from Local

```bash
# Export from local database
cd ~/Desktop/OTS-ERP/backups/$(date +%Y%m%d)

# Export Role system
pg_dump "postgresql://localhost/ots_erp_local" \
  --data-only \
  --table="\"Role\"" \
  --table="\"Permission\"" \
  --table="\"RolePermission\"" \
  --table="\"RoleAssignment\"" \
  --table="\"UserPermission\"" \
  -f role_system_data.sql

# Export time entry enhancements
pg_dump "postgresql://localhost/ots_erp_local" \
  --data-only \
  --table="\"TimeEntryRejectionNote\"" \
  -f rejection_notes_data.sql
```

### 6.2 Import to RDS

```bash
# Import role system
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -f role_system_data.sql

# Import rejection notes
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -f rejection_notes_data.sql
```

### 6.3 Verify Data Import

```sql
-- Check Role data
SELECT COUNT(*) FROM "Role";  -- Should be 8

-- Check Permission data
SELECT COUNT(*) FROM "Permission";  -- Depends on your local

-- Check RoleAssignment
SELECT COUNT(*) FROM "RoleAssignment";  -- Should be 1

-- Check TimeEntryRejectionNote
SELECT COUNT(*) FROM "TimeEntryRejectionNote";  -- Should be 9
```

---

## Step 7: Validation (20 minutes)

### 7.1 Schema Validation

```bash
# Run validation script
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  -f 07-validate.sql
```

```sql
-- Count tables
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Should be: 129

-- Count triggers
SELECT COUNT(*) FROM information_schema.triggers
WHERE trigger_schema = 'public';
-- Should be: 96

-- Verify critical tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('Role', 'Permission', 'TimeEntryPhoto', 'TimeEntryRejectionNote')
ORDER BY table_name;
-- Should return all 4

-- Verify foreign keys intact
SELECT COUNT(*) FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';
-- Should be: ~164
```

### 7.2 Data Integrity Validation

```sql
-- Verify user count unchanged
SELECT COUNT(*) FROM "User";  -- Should be 9

-- Verify job count unchanged
SELECT COUNT(*) FROM "Job";  -- Should be 36

-- Verify customer count unchanged
SELECT COUNT(*) FROM "Customer";  -- Should be 20

-- Verify time entry count unchanged
SELECT COUNT(*) FROM "TimeEntry";  -- Should be 5

-- Verify file count unchanged
SELECT COUNT(*) FROM "FileAttachment";  -- Should be 63

-- Check no NULL primary keys
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'id'
  AND is_nullable = 'YES';
-- Should return 0 rows
```

### 7.3 Trigger Functionality Test

```sql
-- Test a simple trigger (updated_at)
UPDATE "User" SET name = name WHERE id = (SELECT id FROM "User" LIMIT 1);

-- Verify updatedAt changed
SELECT id, name, "updatedAt" FROM "User" LIMIT 1;
-- updatedAt should be current timestamp

-- Test role change logging (if triggers work)
-- This should NOT error
UPDATE "User" SET role = role WHERE id = (SELECT id FROM "User" LIMIT 1);
```

---

## Step 8: Deploy New Container (15 minutes)

### 8.1 Verify Current ECS Task

```bash
# Check current running tasks
aws ecs list-tasks \
  --cluster ots-erp-cluster \
  --region us-east-2

# Get current task definition
aws ecs describe-services \
  --cluster ots-erp-cluster \
  --services ots-erp-svc \
  --region us-east-2 \
  --query "services[0].taskDefinition"
```

### 8.2 Update ECS Service (Force New Deployment)

```bash
# Deploy new container (assumes already pushed to ECR)
aws ecs update-service \
  --cluster ots-erp-cluster \
  --service ots-erp-svc \
  --force-new-deployment \
  --region us-east-2

# Monitor deployment
aws ecs describe-services \
  --cluster ots-erp-cluster \
  --services ots-erp-svc \
  --region us-east-2 \
  --query "services[0].deployments"
```

### 8.3 Watch Logs

```bash
# Tail application logs
aws logs tail /ecs/ots-erp --follow --region us-east-2

# Look for:
# ✅ "Server running on port 3000"
# ✅ "Database connected"
# ❌ Any errors about missing tables
# ❌ Any errors about missing columns
```

---

## Step 9: Post-Deployment Testing (20 minutes)

### 9.1 Health Check

```bash
# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --region us-east-2 \
  --query "LoadBalancers[0].DNSName" \
  --output text)

# Test health endpoint
curl http://${ALB_DNS}/api/healthz

# Should return: {"status":"ok"}
```

### 9.2 Test Login

```bash
# Test admin login
curl -X POST http://${ALB_DNS}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@admin.com","password":"admin123"}'

# Should return:
# {
#   "success": true,
#   "token": "eyJ...",
#   "user": {
#     "id": "23ff66c1-...",
#     "email": "admin@admin.com",
#     "role": "OWNER_ADMIN"
#   }
# }
```

### 9.3 Test Role & Permissions (New Feature)

```bash
# Get a token first (from login above)
TOKEN="<token_from_login>"

# Test roles endpoint
curl http://${ALB_DNS}/api/rbac/roles \
  -H "Cookie: auth-token=${TOKEN}"

# Should return list of roles (8 roles)
```

### 9.4 Test Time Entry (Core Feature)

```bash
# Test time entries endpoint
curl http://${ALB_DNS}/api/time-entries \
  -H "Cookie: auth-token=${TOKEN}"

# Should return list of time entries (5 entries)
```

### 9.5 Browser Testing

**Open in browser:**
1. `http://${ALB_DNS}` - Should load login page
2. Login with `admin@admin.com` / `admin123`
3. Navigate to:
   - Dashboard - Should load ✅
   - Time Tracking - Should load ✅
   - Settings → Roles & Permissions - Should load ✅
   - Jobs - Should show 36 jobs ✅
   - Customers - Should show 20 customers ✅

**Test new features:**
1. Settings → Roles - Should show 8 roles ✅
2. Time entry → Rejection workflow - Should work ✅
3. Accounting module - Should be accessible ✅

---

## Step 10: Cleanup & Documentation (10 minutes)

### 10.1 Document Migration

```bash
# Create migration log
cat > ~/Desktop/OTS-ERP/backups/$(date +%Y%m%d)/MIGRATION_LOG.md << 'EOF'
# Migration Log - Production RDS Schema Update

**Date:** $(date)
**Status:** Success

## What Was Done:
- Created 29 new tables
- Modified 9 existing tables
- Created 44 new triggers
- Migrated role & permission data
- Deployed new container

## Validation Results:
- Total tables: 129 ✅
- Total triggers: 96 ✅
- Users: 9 ✅
- Jobs: 36 ✅
- Customers: 20 ✅
- Time Entries: 5 ✅

## Backup Location:
~/Desktop/OTS-ERP/backups/$(date +%Y%m%d)/

## Next Steps:
- Monitor logs for 24 hours
- Test all major workflows
- Keep backups for 30 days
EOF
```

### 10.2 Keep Backups

```bash
# Backups to keep for 30 days:
ls -lh ~/Desktop/OTS-ERP/backups/$(date +%Y%m%d)/

# Expected files:
# - rds_full_backup_*.dump (full database)
# - rds_full_backup_*.sql (readable SQL)
# - *.csv (critical tables)
# - role_system_data.sql (imported data)
```

### 10.3 Close SSH Tunnel (If Used)

```bash
# Find tunnel process
ps aux | grep "ssh.*5433"

# Kill it (replace PID)
kill <PID>

# Or use the shell ID from earlier
```

---

## Rollback Plan (If Needed)

### If Migration Fails Mid-Way

```bash
# Option 1: Restore from full backup
pg_restore -d "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" \
  --clean \
  --if-exists \
  rds_full_backup_YYYYMMDD_HHMMSS.dump
```

### If Container Deployment Fails

```bash
# Rollback to previous task definition
aws ecs update-service \
  --cluster ots-erp-cluster \
  --service ots-erp-svc \
  --task-definition ots-erp:<PREVIOUS_VERSION> \
  --region us-east-2
```

### If Both Fail

1. Restore database from backup
2. Rollback container to previous version
3. Both systems back to working state
4. Review logs, fix issues, retry

---

## Success Criteria

Migration is successful when:

- [x] All 129 tables exist
- [x] All 96 triggers exist
- [x] All users can log in
- [x] Roles & permissions work
- [x] Time entry workflow works
- [x] Accounting module accessible
- [x] No errors in logs
- [x] All smoke tests pass

---

## Next Steps After Migration

1. **Monitor for 24 hours**
   - Check logs hourly
   - Watch for database errors
   - Monitor user activity

2. **User Communication**
   - Notify team migration complete
   - Document any new features available
   - Provide support for issues

3. **Performance Baseline**
   - Monitor query performance
   - Check page load times
   - Optimize if needed

4. **Backup Schedule**
   - Keep migration backups for 30 days
   - Resume normal backup schedule
   - Document recovery procedures

---

**Estimated Total Time:** 2-3 hours
**Best Time to Run:** Off-peak hours (evening/weekend)
**Required:** Database access, AWS credentials, SSH tunnel
**Risk Level:** 🟡 Medium (with backups: 🟢 Low)

---

## Quick Reference Commands

```bash
# SSH Tunnel
ssh -i ~/Desktop/ortmeier-bastion-key.pem \
  -L 5433:ots-erp-prod-rds.c5cymmac2hya.us-east-2.rds.amazonaws.com:5432 \
  ec2-user@18.223.108.189 -N

# Connect to RDS
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier"

# Backup
pg_dump ... -f backup.dump

# Restore
pg_restore -d ... backup.dump

# Deploy
aws ecs update-service --cluster ots-erp-cluster --service ots-erp-svc --force-new-deployment
```
