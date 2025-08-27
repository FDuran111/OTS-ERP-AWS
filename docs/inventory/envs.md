# Environment Variables Inventory

## Current Environment Variables

| Variable Name | File Location | Usage |
|---------------|---------------|-------|
| DATABASE_URL | src/lib/db.ts:6, src/lib/inventory-tracking.ts:4, src/lib/service-calls.ts:4, multiple migration scripts | PostgreSQL connection string |
| JWT_SECRET | src/lib/auth.ts:4 | JWT token signing |
| NODE_ENV | Multiple files | Environment detection (development/production) |
| SUPABASE_SERVICE_ROLE_KEY | src/lib/supabase.ts:4, src/lib/supabase-storage.ts:15 | Supabase authentication |
| NEXT_PUBLIC_SUPABASE_URL | src/lib/supabase-storage.ts:14 | Supabase project URL |
| PORT | healthcheck.js:12 | Server port configuration |
| UPLOAD_DIR | src/lib/file-storage.ts:26 | Local file upload directory |
| MAX_FILE_SIZE | src/lib/file-storage.ts:27 | Maximum upload file size |
| QB_CLIENT_ID | src/lib/quickbooks-client.ts:36 | QuickBooks OAuth client ID |
| QB_CLIENT_SECRET | src/lib/quickbooks-client.ts:37 | QuickBooks OAuth secret |
| QB_REDIRECT_URI | src/lib/quickbooks-client.ts:38 | QuickBooks OAuth callback |
| QB_SANDBOX_MODE | src/lib/quickbooks-client.ts:39,43 | QuickBooks environment toggle |
| EMAIL_PROVIDER | src/lib/email.ts:33 | Email service provider |
| EMAIL_API_KEY | src/lib/email.ts:34 | Email service API key |
| EMAIL_FROM | src/lib/email.ts:35 | Default from email address |
| EMAIL_FROM_NAME | src/lib/email.ts:36 | Default from name |
| NEXTAUTH_SECRET | src/app/api/debug/route.ts:15 | NextAuth session encryption |
| NEXTAUTH_URL | src/app/api/debug/route.ts:16 | NextAuth base URL |
| RUN_MIGRATIONS_ON_STARTUP | src/lib/startup-init.ts:15 | Auto-run migrations flag |
| MIGRATION_AUTH_TOKEN | src/app/api/migrations/run/route.ts:10 | Migration API auth token |
| FORCE_HTTPS | src/app/api/auth/login/route.ts:71 | Force HTTPS cookies |
| NEXT_PUBLIC_GOOGLE_MAPS_API_KEY | src/components/analytics/ServiceAreaMap.tsx:26,28 | Google Maps API key |
| STAGING_BASE_URL | scripts/smoke-staging.mjs:13 | Staging environment URL |
| STAGING_BASIC_AUTH | scripts/smoke-staging.mjs:14 | Staging basic auth credentials |
| AWS_REGION | scripts/env/inventory-staging.mjs:17 | AWS region (existing but unused) |

## AWS-Prefixed Variables to Replace

⚠️ **WARNING**: AWS Amplify ignores environment variables starting with `AWS_`

| Current Name | Issue | Proposed Replacement |
|--------------|-------|---------------------|
| AWS_REGION | Amplify ignores | DEPLOYMENT_REGION |
| AWS_ACCESS_KEY_ID | Amplify ignores | (Use IAM roles instead) |
| AWS_SECRET_ACCESS_KEY | Amplify ignores | (Use IAM roles instead) |

## Proposed AWS Environment Variables

### Storage Configuration
- `STORAGE_DRIVER=s3` - Storage provider selection
- `S3_BUCKET=ots-erp-uploads` - S3 bucket name
- `S3_REGION=us-east-2` - S3 bucket region
- `S3_CLOUDFRONT_URL` - Optional CDN URL for file serving

### Database Configuration
- `DB_DRIVER=postgres` - Database driver
- `RDS_PROXY_ENDPOINT` - RDS Proxy endpoint for connection pooling
- `RDS_DB=ortmeier` - Database name
- `RDS_USER` - Database username
- `RDS_PASSWORD` - Database password (use Secrets Manager in production)
- `RDS_SSL_MODE=require` - Force SSL connections

### Authentication & Application
- `JWT_SECRET` - Keep existing
- `NODE_ENV` - Keep existing
- `MAINTENANCE_READONLY=false` - Maintenance mode flag
- `APP_VERSION` - Application version for deployments
- `DEPLOYMENT_REGION=us-east-2` - AWS deployment region

### QuickBooks Integration (unchanged)
- `QB_CLIENT_ID` - Keep existing
- `QB_CLIENT_SECRET` - Keep existing
- `QB_REDIRECT_URI` - Keep existing
- `QB_SANDBOX_MODE` - Keep existing

### Email Configuration (unchanged)
- `EMAIL_PROVIDER` - Keep existing
- `EMAIL_API_KEY` - Keep existing
- `EMAIL_FROM` - Keep existing
- `EMAIL_FROM_NAME` - Keep existing

### Migration & Feature Flags
- `RUN_MIGRATIONS_ON_STARTUP` - Keep existing
- `MIGRATION_AUTH_TOKEN` - Keep existing
- `FORCE_HTTPS=true` - Keep existing, always true in production

## Environment Variable Groups

### Required for AWS Deployment
```
# Storage
STORAGE_DRIVER=s3
S3_BUCKET=ots-erp-uploads
S3_REGION=us-east-2

# Database
DATABASE_URL=postgresql://user:pass@rds-proxy.region.amazonaws.com:5432/ortmeier
RDS_SSL_MODE=require

# Auth
JWT_SECRET=<secure-random-string>
NODE_ENV=production
```

### Optional/Feature-Specific
```
# QuickBooks
QB_CLIENT_ID=
QB_CLIENT_SECRET=
QB_REDIRECT_URI=
QB_SANDBOX_MODE=

# Email
EMAIL_PROVIDER=
EMAIL_API_KEY=
EMAIL_FROM=
EMAIL_FROM_NAME=

# Features
RUN_MIGRATIONS_ON_STARTUP=false
FORCE_HTTPS=true
```