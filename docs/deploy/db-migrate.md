# Database Migration Guide for RDS

## Prerequisites

Before running database migrations:

1. **Terraform Infrastructure Applied**
   - Ensure `npm run infra:apply` has completed successfully
   - RDS instance should be in "Available" state
   - RDS Proxy should be active

2. **RDS Connection Verified**
   - Run `./scripts/aws/validate-rds.sh` to confirm connectivity
   - Ensure you have the RDS proxy endpoint from Terraform outputs

3. **Secrets Available**
   - RDS password should be stored in AWS Secrets Manager
   - Retrieve with: `aws secretsmanager get-secret-value --secret-id "ots-erp/prod/rds/password"`

## Migration Process

### Step 1: Export Environment Variables

```bash
export DB_DRIVER=RDS
export RDS_PROXY_ENDPOINT=<your-proxy-endpoint>.proxy-xyz.us-east-2.rds.amazonaws.com
export RDS_DB=ortmeier
export RDS_USER=otsapp
export RDS_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id "ots-erp/prod/rds/password" \
  --query SecretString --output text)
```

### Step 2: Dry Run (Preview)

Always start with a dry run to see what migrations will be executed:

```bash
DB_DRIVER=RDS \
RDS_PROXY_ENDPOINT=<proxy> \
RDS_DB=ortmeier \
RDS_USER=otsapp \
RDS_PASSWORD=<password> \
npm run db:migrate -- --dry-run
```

Expected output:
```
🔧 Database Migration Runner
============================
🔍 DRY RUN MODE - No changes will be made

📡 Connecting to RDS via proxy: <proxy-endpoint>
✅ Database connection successful

📁 Found 15 migration files

[DRY] 01-create-users.sql - Would execute 2456 characters
[DRY] 02-create-customers.sql - Would execute 1823 characters
[DRY] 03-create-jobs.sql - Would execute 3421 characters
...
```

### Step 3: Run Migrations

After reviewing the dry run, execute the actual migrations:

```bash
npm run db:migrate
```

Expected output:
```
🔧 Database Migration Runner
============================
📡 Connecting to RDS via proxy: <proxy-endpoint>
✅ Database connection successful

📁 Found 15 migration files

[OK] 01-create-users.sql
[OK] 02-create-customers.sql
[OK] 03-create-jobs.sql
...

✨ Migration complete
```

### Step 4: Verify Tables

Confirm all tables were created with expected structure:

```bash
npm run db:migrate:verify
```

Expected output:
```
📊 Verifying table counts...
  User: 0 rows
  Customer: 0 rows
  Job: 0 rows
  Material: 0 rows
  Invoice: 0 rows
  Settings: 0 rows
  Equipment: 0 rows
  TimeEntry: 0 rows
  FileAttachment: 0 rows
```

### Step 5: Seed Initial Data

Load default admin user and system settings:

```bash
npm run db:migrate:seed
```

This will:
- Create a default OWNER_ADMIN user (admin@ortmeier.com)
- Insert default system settings (company name, tax rate, timezone)

**Important**: Update the admin password hash in `scripts/seed-db.sql` before running!

Generate a proper bcrypt hash:
```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('your-secure-password', 12);
console.log(hash);
```

## Migration Files Structure

Migrations are loaded from `src/lib/db-migrations/` in lexicographic order:

```
src/lib/db-migrations/
├── 01-create-users.sql
├── 02-create-customers.sql
├── 03-create-jobs.sql
├── 04-create-materials.sql
├── 05-create-invoices.sql
└── ...
```

### Naming Convention

- Use numeric prefixes for ordering: `01-`, `02-`, etc.
- Use descriptive names: `create-`, `alter-`, `add-index-`
- Keep migrations idempotent when possible (use IF NOT EXISTS)

## Troubleshooting

### Connection Failed

```
❌ RDS_PROXY_ENDPOINT is required when DB_DRIVER=RDS
```

Solution: Export the RDS_PROXY_ENDPOINT environment variable.

### Migration Failed

```
[FAIL] 03-create-jobs.sql: relation "User" does not exist
```

Solution: 
- Check migration order - dependencies must run first
- Verify previous migrations completed successfully
- Review the SQL file for syntax errors

### Table Not Found During Verify

```
Customer: ❌ Table not found
```

Solution:
- Check if the migration creating that table failed
- Review migration logs for errors
- Manually inspect database: `psql -h <proxy> -U otsapp -d ortmeier`

### Permission Denied

```
[FAIL] 01-create-users.sql: permission denied for schema public
```

Solution:
- Ensure RDS user has proper permissions
- Grant schema permissions if needed:
  ```sql
  GRANT ALL ON SCHEMA public TO otsapp;
  ```

## Backup and Recovery

### Before Migration

Always backup existing data if migrating a production database:

```bash
pg_dump -h <old-host> -U <user> -d <database> > backup-$(date +%Y%m%d).sql
```

### Rollback Strategy

If migrations fail midway:

1. **Drop all tables** (CAUTION - destroys data):
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

2. **Re-run migrations** from the beginning:
   ```bash
   npm run db:migrate
   ```

3. **Restore from backup** if needed:
   ```bash
   psql -h <proxy> -U otsapp -d ortmeier < backup-20240120.sql
   ```

## Production Checklist

- [ ] Dry run completed without errors
- [ ] Database backup created
- [ ] Maintenance window scheduled
- [ ] Admin password hash updated in seed file
- [ ] Connection pooling configured (RDS Proxy)
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented
- [ ] Team notified of migration

## Next Steps

After successful migration:

1. **Data Migration**: Import existing data from Supabase (Prompt 9)
2. **Application Cutover**: Switch app to use RDS (Prompt 10)
3. **Performance Tuning**: Optimize queries and indexes
4. **Monitoring Setup**: Configure CloudWatch alarms

## Notes

- All SQL files are executed in a single transaction when possible
- Migrations are not reversible - plan carefully
- Keep migration files in source control
- Test migrations in a staging environment first
- Monitor RDS metrics during migration for performance issues