# RDS Schema Check Instructions

## Step 1: Connect to RDS via SSH Tunnel
Open Terminal and run:
```bash
ssh -i ~/Desktop/ortmeier-bastion-key.pem -L 5433:ots-erp-prod-rds.c5cymmac2hya.us-east-2.rds.amazonaws.com:5432 ec2-user@18.223.108.189 -N
```

## Step 2: In a NEW Terminal window, connect to RDS
```bash
psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" -f check_rds_schema.sql > rds_schema_report.txt
```

## Step 3: View the report
```bash
cat rds_schema_report.txt
```

## What We're Looking For:

### 1. **File Storage Tables**
- Does `FileUpload` table exist? (Needed for S3)
- What columns exist in `JobAttachment` table?
- What columns exist in `FileAttachment` table?

### 2. **Recent Changes**
- Does `TimeEntry` table have edit request tracking?
- Does `User` table have proper role field?
- Are there any missing tables from local?

### 3. **Data Volumes**
- How many records in each main table?
- This helps us understand production usage

## Local Schema Summary (for comparison):

### Tables in Local but possibly NOT in RDS:
- Various View tables (CategoryPerformanceView, CustomerPhotoView, etc.)
- CrewDailyHours
- EmployeeCostSummary
- EquipmentBillingSummary
- JobCostAnalysis
- MaterialAvailability
- QuickBooksSyncStatus
- ScheduleView
- UserPermissionsView

### Key findings from Local:
1. **NO FileUpload table exists** - Need to create for S3 integration
2. **JobAttachment exists** with columns for file references
3. **FileAttachment exists** with full file metadata structure
4. **TimeEntry** has 18 columns (no edit request fields yet)
5. **User** table has 'role' field of type USER-DEFINED (enum)

## After Running RDS Check:

Compare the outputs and look for:
1. Missing tables in RDS
2. Missing columns in existing tables
3. Different data types or constraints
4. Record counts to understand data migration needs

## Safe Migration Strategy:

1. **NEVER DROP TABLES OR COLUMNS** in production
2. Only ADD new columns/tables
3. Make columns nullable initially
4. Test migrations on staging first
5. Always backup before migrations

## Next Steps:

Once we have the RDS schema report, we'll:
1. Create a migration script for missing items
2. Test locally first
3. Apply to staging (if available)
4. Apply to production with backup