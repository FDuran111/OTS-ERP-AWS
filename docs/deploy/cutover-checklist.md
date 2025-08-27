# Production Cut-Over Checklist

## Pre-Migration Requirements

- [ ] AWS infrastructure deployed (S3, RDS, RDS Proxy, Secrets)
- [ ] RDS connection validated using `./scripts/aws/validate-rds.sh`
- [ ] S3 bucket validated using `npm run aws:validate:s3`
- [ ] Database schema migrations tested in staging
- [ ] Full backup of Supabase database completed
- [ ] Maintenance window scheduled and communicated
- [ ] Rollback plan documented and tested

## Cut-Over Steps

### 1. Enable Maintenance Mode

```bash
# Set environment variable in current production
export MAINTENANCE_READONLY=true
```

⏱️ **Duration**: 1 minute  
✅ **Verify**: Users see maintenance message, writes are blocked

### 2. Run Schema Migrations on RDS

```bash
# Export RDS credentials
export DB_DRIVER=RDS
export RDS_PROXY_ENDPOINT=<your-proxy-endpoint>
export RDS_DB=ortmeier
export RDS_USER=otsapp
export RDS_PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id "ots-erp/prod/rds/password" \
  --query SecretString --output text)

# Run migrations
npm run db:migrate
```

⏱️ **Duration**: 5-10 minutes  
✅ **Verify**: All migrations show `[OK]` status

### 3. Export Supabase Data

```bash
# Export from Supabase
export DATABASE_URL=<your-supabase-database-url>
./scripts/export-supabase.sh
```

⏱️ **Duration**: 10-15 minutes (depends on data size)  
✅ **Verify**: File `supabase-dump-YYYY-MM-DD.sql` created

### 4. Import Data into RDS

```bash
# Import to RDS
./scripts/import-rds.sh supabase-dump-$(date +%F).sql
```

⏱️ **Duration**: 15-20 minutes (depends on data size)  
✅ **Verify**: Import completes without errors

### 5. Migrate Storage Files

```bash
# Run storage migration (if not already done)
export STORAGE_DRIVER=S3
export S3_BUCKET=<your-s3-bucket>
export S3_REGION=us-east-2
npm run migrate:storage
```

⏱️ **Duration**: 30-60 minutes (depends on file count/size)  
✅ **Verify**: Check `migration-log.csv` for any failures

### 6. Validate Data Migration

```bash
# Run validation script
tsx scripts/validate-data.ts
```

Expected output:
```
📊 Comparing table row counts:

Table               | Supabase | RDS      | Status
--------------------|----------|----------|----------
User                | 45       | 45       | ✅ Match
Customer            | 156      | 156      | ✅ Match
Job                 | 423      | 423      | ✅ Match
Material            | 89       | 89       | ✅ Match
Invoice             | 234      | 234      | ✅ Match
TimeEntry           | 1245     | 1245     | ✅ Match
Equipment           | 45       | 45       | ✅ Match
FileAttachment      | 678      | 678      | ✅ Match
Settings            | 12       | 12       | ✅ Match

✅ Validation PASSED - Data migration successful
```

⏱️ **Duration**: 2-3 minutes  
✅ **Verify**: All counts match (< 2% discrepancy)

### 7. Update Application Configuration

Update `.env` or environment variables:

```bash
# Storage - Switch to AWS S3
STORAGE_DRIVER=S3
S3_BUCKET=ots-erp-prod-uploads
S3_REGION=us-east-2
S3_CLOUDFRONT_URL=https://cdn.your-domain.com  # Optional

# Database - Switch to AWS RDS
DB_DRIVER=RDS
RDS_PROXY_ENDPOINT=<proxy-endpoint>.proxy-xyz.us-east-2.rds.amazonaws.com
RDS_DB=ortmeier
RDS_USER=otsapp
RDS_PASSWORD=<from-secrets-manager>
RDS_SSL_MODE=require

# Remove/comment out Supabase variables
# DATABASE_URL=<removed>
# SUPABASE_URL=<removed>
# SUPABASE_ANON_KEY=<removed>
# SUPABASE_SERVICE_ROLE_KEY=<removed>
```

### 8. Deploy Application to AWS

Deploy using your chosen method:

**Option A: AWS Amplify**
```bash
git push origin main
# Amplify auto-deploys
```

**Option B: ECS/Fargate**
```bash
docker build -t ots-erp .
docker tag ots-erp:latest <ecr-repo-url>:latest
docker push <ecr-repo-url>:latest
aws ecs update-service --cluster <cluster> --service <service> --force-new-deployment
```

⏱️ **Duration**: 10-15 minutes  
✅ **Verify**: Deployment successful, health checks passing

### 9. Run Smoke Tests

Test critical functionality:

```bash
# 1. Health check
curl https://your-app-domain.com/api/health

# Expected:
{
  "status": "healthy",
  "drivers": {
    "database": "RDS",
    "storage": "S3"
  },
  "services": {
    "database": "healthy",
    "storage": "healthy"
  }
}
```

Manual tests:
- [ ] Login as admin user
- [ ] Create a new job
- [ ] Upload a file attachment
- [ ] Generate an invoice
- [ ] View customer list
- [ ] Check equipment tracking

⏱️ **Duration**: 10-15 minutes  
✅ **Verify**: All operations complete successfully

### 10. Disable Maintenance Mode

```bash
export MAINTENANCE_READONLY=false
# Redeploy or restart application
```

⏱️ **Duration**: 1 minute  
✅ **Verify**: Application accessible to all users

### 11. Decommission Legacy Infrastructure

After 24-48 hours of stable operation:

- [ ] Stop Coolify deployment
- [ ] Pause Supabase project (keep for 30 days as backup)
- [ ] Update DNS records if needed
- [ ] Remove legacy environment variables
- [ ] Archive migration scripts and logs

## Rollback Procedure

If critical issues occur during migration:

### Quick Rollback (< 5 minutes)

1. Switch environment variables back:
   ```bash
   STORAGE_DRIVER=SUPABASE
   DB_DRIVER=SUPABASE
   DATABASE_URL=<original-supabase-url>
   ```

2. Redeploy application with original configuration

3. Investigate and fix issues before retry

### Full Rollback (if data corrupted)

1. Drop RDS tables:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```

2. Re-run migrations from scratch

3. Re-import from backup

4. Validate data integrity

## Post-Migration Checklist

### Day 1
- [ ] Monitor application logs for errors
- [ ] Check CloudWatch metrics (CPU, memory, connections)
- [ mysterious] Verify backup jobs are running
- [ ] Test all critical user workflows
- [ ] Document any issues or performance changes

### Week 1
- [ ] Review AWS costs vs projections
- [ ] Optimize RDS instance size if needed
- [ ] Tune connection pool settings
- [ ] Update runbooks and documentation
- [ ] Train team on AWS console access

### Month 1
- [ ] Complete Supabase sunset
- [ ] Review and optimize indexes
- [ ] Set up automated backups and disaster recovery
- [ ] Conduct post-mortem meeting
- [ ] Update architecture diagrams

## Emergency Contacts

- **AWS Support**: [AWS Support Console](https://console.aws.amazon.com/support)
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Database Admin**: admin@company.com
- **DevOps Lead**: devops@company.com

## Metrics to Monitor

During and after migration:

- **RDS Metrics**:
  - CPU Utilization (target < 70%)
  - Database Connections (monitor for spikes)
  - Read/Write Latency (< 10ms)
  - Free Storage Space (> 20%)

- **Application Metrics**:
  - Response Time (p95 < 500ms)
  - Error Rate (< 0.1%)
  - Active Users
  - Request Rate

- **S3 Metrics**:
  - Request Count
  - 4xx/5xx Errors
  - Latency

## Success Criteria

Migration is considered successful when:

- ✅ All data validated with < 2% discrepancy
- ✅ Application running on AWS infrastructure
- ✅ No critical errors in 24 hours
- ✅ Performance metrics meet or exceed baseline
- ✅ All smoke tests passing
- ✅ Users able to access all functionality
- ✅ Legacy infrastructure decommissioned

## Notes

- Keep this checklist updated with actual times and issues encountered
- Document any deviations from the plan
- Save all logs and outputs for audit purposes
- Consider running a disaster recovery drill within 30 days