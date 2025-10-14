# 🚨 COMPLETE PRODUCTION MIGRATION REQUIREMENTS

**Date:** 2025-10-13  
**Analysis:** COMPREHENSIVE column-by-column comparison completed  
**Status:** ✅ READY FOR EXECUTION

---

## 📊 SUMMARY

- **Total columns analyzed:** 2,189 (local) vs 2,113 (production)
- **Missing in production:** 142 columns across multiple tables
- **Critical for deployment:** 8 items (tables + columns + enums)  
- **Risk level:** MEDIUM-HIGH without these migrations
- **Estimated time:** 10-15 minutes

---

## 🔴 CRITICAL MIGRATIONS (MUST RUN)

### 1. Missing Tables (2)

#### A. `TimeEntryMaterial` Table
**Migration:** `src/lib/db-migrations/2025-10-07-materials-table.sql`  
**Impact:** HIGH - Materials tracking will completely fail

#### B. `NewJobEntry` Table  
**Migration:** `src/lib/db-migrations/2025-10-12-new-job-entry.sql`  
**Impact:** HIGH - Employee job creation will completely fail

---

### 2. Missing Columns in TimeEntry (4)

Production TimeEntry has 38 columns, Local has 42.

**Missing columns:**
- `categoryHours` (JSONB) - Hour category breakdown
- `location` (TEXT) - Work location  
- `jobDescription` (TEXT) - Job/area description
- `workDescription` (TEXT) - Work performed description

**Migrations Required:**
1. `src/lib/db-migrations/2025-10-07-hour-categories.sql` (adds categoryHours)
2. `src/lib/db-migrations/2025-10-07-description-fields.sql` (adds location, jobDescription, workDescription)

**Impact:** HIGH - Bulk time entry API will fail, weekly summary will fail

---

### 3. Missing Column in Job Table (1)

**Missing column:**
- `customerPO` (TEXT) - Customer purchase order number

**Migration:** `src/lib/db-migrations/2025-10-12-add-customer-po.sql`  
**Impact:** MEDIUM - Job updates with PO will fail

---

### 4. Missing Enum Values (2)

**JobStatus enum missing values:**
- `PENDING_REVIEW`
- `PENDING_APPROVAL`

**Migration:** `src/lib/db-migrations/2025-10-13-add-pending-approval-status.sql` (needs update)  
**Impact:** CRITICAL - Job approval workflow will completely fail

---

## ⚠️ MISSING VIEWS (Not Critical for Deployment)

These views exist in local but not production. They are NOT used by the current application:

- `AccountHierarchy` (11 columns)
- `MaterialCostTrends` (10 columns)
- `MaterialKitSummary` (11 columns)
- `PeriodSummary` (9 columns)
- `PurchaseOrderReceivingStatus` (10 columns)
- `UnreadNotificationCount` (4 columns)

**Action:** ⚠️ SKIP FOR NOW - These are reporting views not required for current deployment

---

## ⚠️ MISSING TABLES (Not Critical for Deployment)

- `OvertimeSettings` (14 columns) - Not currently used
- `TimeTrackingSettings` (22 columns) - Not currently used  
- `TimeEntryAudit` (2 extra columns) - Audit table, non-critical

**Action:** ⚠️ SKIP FOR NOW - Can be added in future migration if needed

---

## ✅ VERIFIED MATCHING ITEMS

These have ALL columns matching:
- ✅ TimeEntry core columns (34 of 38 match, 4 need to be added)
- ✅ User table - All columns match
- ✅ Customer table - All columns match  
- ✅ TimeEntryPhoto table - Exists in both

---

## 🔧 MIGRATION EXECUTION PLAN (UPDATED)

### Pre-Migration Checklist
- [x] SSH tunnel established
- [x] Column-by-column analysis complete  
- [x] Application code usage verified
- [ ] Final review and approval

---

### Execution Order (MUST BE SEQUENTIAL)

```bash
# Connect to production via SSH tunnel first
# ssh -i ~/Desktop/ortmeier-bastion-key.pem -L 5433:ots-erp-prod-rds.c5cymmac2hya.us-east-2.rds.amazonaws.com:5432 ec2-user@18.223.108.189 -N &

# Step 1: Add PENDING_REVIEW to JobStatus enum
PGPASSWORD="LPiSvMCtjszj35aZfRJL" psql -h localhost -p 5433 -U otsapp -d ortmeier \
  -c "ALTER TYPE \"JobStatus\" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';"

# Step 2: Add PENDING_APPROVAL to JobStatus enum  
PGPASSWORD="LPiSvMCtjszj35aZfRJL" psql -h localhost -p 5433 -U otsapp -d ortmeier \
  -c "ALTER TYPE \"JobStatus\" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';"

# Step 3: Add categoryHours column to TimeEntry
PGPASSWORD="LPiSvMCtjszj35aZfRJL" psql -h localhost -p 5433 -U otsapp -d ortmeier \
  < src/lib/db-migrations/2025-10-07-hour-categories.sql

# Step 4: Add description fields to TimeEntry (location, jobDescription, workDescription)
PGPASSWORD="LPiSvMCtjszj35aZfRJL" psql -h localhost -p 5433 -U otsapp -d ortmeier \
  < src/lib/db-migrations/2025-10-07-description-fields.sql

# Step 5: Add customerPO column to Job table
PGPASSWORD="LPiSvMCtjszj35aZfRJL" psql -h localhost -p 5433 -U otsapp -d ortmeier \
  < src/lib/db-migrations/2025-10-12-add-customer-po.sql

# Step 6: Create TimeEntryMaterial table
PGPASSWORD="LPiSvMCtjszj35aZfRJL" psql -h localhost -p 5433 -U otsapp -d ortmeier \
  < src/lib/db-migrations/2025-10-07-materials-table.sql

# Step 7: Create NewJobEntry table
PGPASSWORD="LPiSvMCtjszj35aZfRJL" psql -h localhost -p 5433 -U otsapp -d ortmeier \
  < src/lib/db-migrations/2025-10-12-new-job-entry.sql
```

---

## 📊 VERIFICATION QUERIES

```sql
-- 1. Verify JobStatus enum
SELECT unnest(enum_range(NULL::public."JobStatus"));
-- Expected: 9 values including PENDING_REVIEW and PENDING_APPROVAL

-- 2. Verify TimeEntry columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'TimeEntry' 
ORDER BY ordinal_position;
-- Expected: 42 columns

-- 3. Verify categoryHours column
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'TimeEntry' AND column_name = 'categoryHours';
-- Expected: categoryHours | jsonb

-- 4. Verify description fields
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'TimeEntry' 
AND column_name IN ('location', 'jobDescription', 'workDescription');
-- Expected: 3 rows

-- 5. Verify customerPO column
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'Job' AND column_name = 'customerPO';
-- Expected: 1 row

-- 6. Verify new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('TimeEntryMaterial', 'NewJobEntry');
-- Expected: 2 rows

-- 7. Final count check
SELECT 
  (SELECT COUNT(*) FROM "TimeEntry") as time_entries,
  (SELECT COUNT(*) FROM "TimeEntryMaterial") as materials,
  (SELECT COUNT(*) FROM "NewJobEntry") as new_job_entries,
  (SELECT COUNT(*) FROM "Job") as jobs;
```

---

## 🚨 ROLLBACK PLAN

```sql
-- Rollback Step 7
DROP TABLE IF EXISTS "NewJobEntry" CASCADE;

-- Rollback Step 6
DROP TABLE IF EXISTS "TimeEntryMaterial" CASCADE;

-- Rollback Step 5
ALTER TABLE "Job" DROP COLUMN IF EXISTS "customerPO";

-- Rollback Step 4
ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS "location";
ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS "jobDescription";
ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS "workDescription";

-- Rollback Step 3
ALTER TABLE "TimeEntry" DROP COLUMN IF EXISTS "categoryHours";

-- Rollback Steps 1-2: Cannot remove enum values (PostgreSQL limitation)
```

---

## 📝 RISK ASSESSMENT

| Item | Risk | Impact | Mitigation |
|------|------|--------|------------|
| Enum additions | **LOW** | Additive only | PostgreSQL handles gracefully |
| TimeEntry columns | **MEDIUM** | Required by bulk API | Test bulk time entry after migration |
| Job.customerPO | **LOW** | Optional field | NULL-able column |
| TimeEntryMaterial | **MEDIUM** | New feature table | Has proper FK constraints |
| NewJobEntry | **MEDIUM** | New feature table | Has proper FK constraints |

---

## ✨ FEATURES ENABLED AFTER MIGRATION

1. ✅ Hour category tracking (categoryHours)
2. ✅ Three-field time entry descriptions (location, job, work)
3. ✅ Customer PO tracking  
4. ✅ Materials tracking
5. ✅ Employee job creation workflow
6. ✅ Pending approval status workflow
7. ✅ Pending review status

---

## 🎯 WHAT WAS SKIPPED (Intentionally)

The following exist in local but are NOT needed for current deployment:

**Views (7):**
- AccountHierarchy, MaterialCostTrends, MaterialKitSummary
- PeriodSummary, PurchaseOrderReceivingStatus
- UnreadNotificationCount

**Tables (3):**
- OvertimeSettings, TimeTrackingSettings  
- Extra TimeEntryAudit columns

**Action:** These can be added in a future migration if features are built that use them.

---

## ✅ DEPLOYMENT READY CHECKLIST

After running these 7 migrations:
- [ ] All 7 migrations completed successfully
- [ ] All verification queries pass
- [ ] No errors in psql output
- [ ] ECS service restart (automatic)
- [ ] Smoke test: Create time entry with materials
- [ ] Smoke test: Employee create job
- [ ] Smoke test: Admin approve pending job

---

**Total Migrations:** 7 SQL operations  
**Estimated Time:** 10-15 minutes  
**Downtime:** None (all additive)  
**Risk Level:** MEDIUM (requires testing after)

