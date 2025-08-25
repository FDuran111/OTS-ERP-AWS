# AWS Services Lock Documentation

## Overview
The OTS-ARP-AWS project enforces strict service isolation for staging and production environments. These environments MUST use AWS services exclusively (RDS for database, S3 for storage) and cannot use Supabase or other third-party services.

## Purpose
This lock ensures:
1. **Security**: Production data stays within AWS boundaries
2. **Compliance**: Meets enterprise requirements for data residency
3. **Performance**: Leverages AWS internal networking
4. **Cost Control**: Avoids duplicate service charges
5. **Reliability**: Single cloud provider for critical environments

## Enforcement Mechanisms

### 1. Build-Time Checks
- `assertEnvIsolation()` runs at application startup
- Throws errors if Supabase variables detected in AWS environments
- Verifies DATABASE_URL points to RDS endpoints
- Checks storage provider configuration

### 2. Runtime Verification
- Database connection verifies RDS hostname pattern
- Storage provider factory rejects Supabase in AWS environments
- Dynamic imports prevent Supabase SDK from loading in production builds

### 3. CI/CD Pipeline
- GitHub Actions verify RDS endpoint before deploying
- Amplify environment variables exclude Supabase credentials
- Smoke tests verify S3 storage is being used

### 4. Admin Visibility
- `/api/admin/env-status` endpoint reports compliance
- Health check includes storage provider information
- Monitoring alerts on configuration violations

## Environment Configuration

### Development (Local)
```env
NEXT_PUBLIC_ENV=development
DATABASE_URL=postgresql://localhost:5432/dev
STORAGE_PROVIDER=supabase  # Allowed for local dev
NEXT_PUBLIC_SUPABASE_URL=https://dev.supabase.co
```

### Staging (AWS)
```env
NEXT_PUBLIC_ENV=staging
DATABASE_URL=postgresql://user:pass@staging.*.rds.amazonaws.com:5432/db
STORAGE_PROVIDER=s3  # REQUIRED
AWS_S3_BUCKET=ots-arp-aws-staging-uploads
# NO Supabase variables allowed
```

### Production (AWS)
```env
NEXT_PUBLIC_ENV=production
DATABASE_URL=postgresql://user:pass@prod.*.rds.amazonaws.com:5432/db
STORAGE_PROVIDER=s3  # REQUIRED
AWS_S3_BUCKET=ots-arp-aws-prod-uploads
# NO Supabase variables allowed
```

## Error Messages

### Storage Provider Errors
```
CONFIGURATION ERROR: staging environment MUST use S3 storage.
STORAGE_PROVIDER is set to 'supabase' but must be 's3' or unset.
Staging and production environments are locked to AWS services only.
```

### Database Errors
```
CONFIGURATION ERROR: staging environment MUST use AWS RDS.
Current database host: staging.supabase.co.
Expected: *.rds.amazonaws.com.
Staging and production are locked to AWS services only.
```

### Supabase Detection
```
Supabase variables detected in staging environment: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
Supabase must not be used in staging/production - these environments are locked to AWS services only.
```

## Testing

### Unit Tests
Run the AWS lock tests:
```bash
npm test -- aws-lock.test.ts
```

### Manual Verification
1. Check environment status:
```bash
curl https://staging.amplifyapp.com/api/admin/env-status
```

2. Verify storage provider:
```bash
curl https://staging.amplifyapp.com/api/health | jq '.storageProvider'
# Should return: "s3"
```

3. Run smoke tests:
```bash
STAGING_BASE_URL=https://staging.amplifyapp.com \
STAGING_BASIC_AUTH=user:pass \
node scripts/smoke-staging.mjs
```

## Migration Guide

### Moving from Supabase to AWS

1. **Database Migration**
   - Export data from Supabase PostgreSQL
   - Import to AWS RDS instance
   - Update DATABASE_URL to RDS endpoint

2. **Storage Migration**
   - Download files from Supabase Storage
   - Upload to S3 bucket with proper prefixes
   - Update file references in database

3. **Environment Variables**
   - Remove all SUPABASE_* variables
   - Add AWS_S3_BUCKET and AWS_REGION
   - Set STORAGE_PROVIDER=s3

4. **Code Changes**
   - Storage provider abstraction handles most changes
   - File upload/download code remains the same
   - URLs will automatically use S3 endpoints

## Troubleshooting

### App Won't Start in Staging
- Check for Supabase variables in environment
- Verify DATABASE_URL points to RDS
- Ensure STORAGE_PROVIDER is set to "s3"

### File Uploads Failing
- Verify S3 bucket exists and has proper permissions
- Check IAM role has S3 access
- Ensure bucket name matches AWS_S3_BUCKET variable

### Database Connection Errors
- Verify RDS instance is in the same VPC
- Check security group allows Lambda/ECS access
- Ensure DATABASE_URL has ?sslmode=require

## Security Considerations

1. **Never** add Supabase credentials to AWS Secrets Manager
2. **Never** set STORAGE_PROVIDER to anything except "s3" in AWS
3. **Always** use IAM roles for AWS service authentication
4. **Always** verify RDS endpoints end with .rds.amazonaws.com

## Monitoring

Set up CloudWatch alarms for:
- Application startup failures (likely configuration issues)
- Storage API errors (S3 access problems)
- Database connection failures (RDS issues)
- Health check failures (overall system health)

## Support

For issues with the AWS lock:
1. Check `/api/admin/env-status` endpoint
2. Review application logs for assertion errors
3. Verify environment variables in Amplify console
4. Contact DevOps team for infrastructure issues