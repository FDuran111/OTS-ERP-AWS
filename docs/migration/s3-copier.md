# Supabase to S3 Storage Migration Tool

## Overview
This script migrates files from Supabase Storage to AWS S3, supporting dry-run mode, resume capability, and comprehensive logging.

## Prerequisites
- Node.js 18+ with tsx
- Supabase service role key
- AWS S3 bucket and credentials configured
- Network access to both Supabase and AWS

## Configuration
Set the following environment variables:
```bash
# Source (Supabase)
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Target (AWS S3)
export S3_BUCKET=your-s3-bucket-name
export S3_REGION=us-east-2  # or your region
```

## Usage Examples

### 1. Dry Run (All Buckets)
Test what would be migrated without actually copying files:
```bash
npm run migrate:storage -- --dry-run
```

### 2. Migrate Specific Prefix
Copy only files under a specific prefix:
```bash
npm run migrate:storage -- --prefix jobs/
```

### 3. Resume from Previous Run
Continue a migration that was interrupted:
```bash
npm run migrate:storage -- --resume migration-log.csv
```

### 4. Combine Options
Dry run for a specific prefix:
```bash
npm run migrate:storage -- --dry-run --prefix customers/
```

Resume and migrate specific prefix:
```bash
npm run migrate:storage -- --resume migration-log.csv --prefix materials/
```

## CSV Log Format
The script creates `migration-log.csv` with the following columns:

| Column | Description | Example Values |
|--------|-------------|----------------|
| bucket | Source Supabase bucket | uploads, thumbnails |
| key | File path within bucket | jobs/123/invoice.pdf |
| status | Migration result | OK, FAIL, DRY_RUN |
| error | Error message (if failed) | Download: timeout |

### Example CSV Output
```csv
bucket,key,status,error
uploads,jobs/2024/invoice-001.pdf,OK,
uploads,jobs/2024/photo-site.jpg,OK,
thumbnails,jobs/2024/thumb_photo-site.jpg,OK,
uploads,customers/cust-123/contract.pdf,FAIL,Download: Network error
uploads,materials/spec-sheet.pdf,DRY_RUN,
```

## Migration Process

### Step 1: Pre-Migration Checklist
- [ ] Ensure all environment variables are set
- [ ] Test S3 access with AWS CLI: `aws s3 ls s3://your-bucket/`
- [ ] Run a dry-run first to verify file list
- [ ] Back up critical files separately if needed

### Step 2: Run Migration
1. **Start with dry run**:
   ```bash
   npm run migrate:storage -- --dry-run
   ```

2. **Review the log file** to ensure correct files are identified

3. **Run actual migration**:
   ```bash
   npm run migrate:storage
   ```

4. **Monitor progress** - the script shows real-time status

5. **If interrupted**, resume from log:
   ```bash
   npm run migrate:storage -- --resume migration-log.csv
   ```

### Step 3: Post-Migration Verification
- Check S3 bucket for migrated files
- Compare file counts between Supabase and S3
- Test file access through the application
- Keep migration-log.csv for audit trail

## Important Notes

### Before Cutting Off Supabase
⚠️ **CRITICAL**: Run this migration BEFORE removing Supabase access or changing STORAGE_DRIVER to S3 in production.

### File Paths
Files are copied with the same structure:
- Supabase: `bucket/path/to/file.pdf`
- S3: `bucket/path/to/file.pdf`

This ensures URLs remain consistent after switching storage drivers.

### Metadata
Each migrated file includes metadata in S3:
- `source`: "supabase-migration"
- `original-bucket`: Source bucket name
- `migration-date`: ISO timestamp

### Performance
- Files are processed sequentially to avoid rate limits
- Large files may take time to transfer
- Network speed affects migration duration

### Error Handling
- Failed files are logged but don't stop the migration
- Review migration-log.csv for any FAIL entries
- Re-run with --resume to retry failed files

## Troubleshooting

### "SUPABASE_SERVICE_ROLE_KEY is required"
Ensure the service role key is set in environment variables.

### "S3_BUCKET is required for non-dry-run mode"
Set the S3_BUCKET environment variable for actual migration.

### Download failures
Check network connectivity and Supabase service status.

### Upload failures
Verify AWS credentials and S3 bucket permissions.

### Files not found
Ensure the prefix filter matches actual file paths in Supabase.

## Recovery
If migration fails partially:
1. Check `migration-log.csv` for status
2. Fix any configuration/network issues
3. Resume with: `npm run migrate:storage -- --resume migration-log.csv`

The script will skip already successful files and retry failures.