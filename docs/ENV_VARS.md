# Environment Variables Documentation

This document describes all environment variables used in the OTS-ARP-AWS application.

## Core Environment

### `NEXT_PUBLIC_ENV`
- **Type:** `string`
- **Values:** `development` | `staging` | `production`
- **Default:** `development`
- **Description:** Determines the application environment. Controls storage prefixes, feature flags, and visual indicators.
- **Example:** `NEXT_PUBLIC_ENV=staging`

## Storage Configuration

### `STORAGE_PROVIDER`
- **Type:** `string`
- **Values:** `s3` | `supabase`
- **Default:** `s3` for staging, `supabase` for development
- **Description:** Selects which storage backend to use for file uploads
- **Example:** `STORAGE_PROVIDER=s3`

### S3 Storage Variables

#### `S3_BUCKET` / `AWS_S3_BUCKET`
- **Type:** `string`
- **Required:** Yes (when using S3)
- **Description:** Name of the S3 bucket for file storage
- **Example:** `S3_BUCKET=ots-arp-aws-uploads`

#### `S3_REGION` / `AWS_REGION`
- **Type:** `string`
- **Default:** `us-east-2`
- **Description:** AWS region where the S3 bucket is located
- **Example:** `S3_REGION=us-west-2`

#### `S3_PUBLIC_URL`
- **Type:** `string`
- **Optional:** Yes
- **Description:** Custom public URL for S3 bucket (if using CloudFront or custom domain)
- **Default:** `https://{bucket}.s3.{region}.amazonaws.com`
- **Example:** `S3_PUBLIC_URL=https://cdn.example.com`

#### `AWS_ACCESS_KEY_ID`
- **Type:** `string`
- **Optional:** Yes (uses IAM role in production)
- **Description:** AWS access key for S3 operations (local development only)
- **Example:** `AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE`

#### `AWS_SECRET_ACCESS_KEY`
- **Type:** `string`
- **Optional:** Yes (uses IAM role in production)
- **Description:** AWS secret key for S3 operations (local development only)
- **Example:** `AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

### Supabase Storage Variables

#### `STORAGE_BUCKET` / `SUPABASE_STORAGE_BUCKET`
- **Type:** `string`
- **Default:** `uploads`
- **Description:** Name of the Supabase storage bucket
- **Example:** `STORAGE_BUCKET=project-uploads`

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Type:** `string`
- **Required:** Yes (when using Supabase)
- **Description:** Supabase project URL
- **Example:** `NEXT_PUBLIC_SUPABASE_URL=https://xudcmdliqyarbfdqufbq.supabase.co`

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Type:** `string`
- **Required:** Yes (when using Supabase)
- **Description:** Supabase anonymous/public key
- **Example:** `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...`

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Type:** `string`
- **Optional:** Yes (recommended for server-side operations)
- **Description:** Supabase service role key for bypassing RLS
- **Example:** `SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...`

### Storage Prefix Configuration

#### `STORAGE_PREFIX`
- **Type:** `string`
- **Optional:** Yes
- **Default:** Automatically set based on `NEXT_PUBLIC_ENV`:
  - `production` → `prod/`
  - `staging` → `staging/`
  - `development` → `dev/`
- **Description:** Override the automatic environment-based prefix
- **Example:** `STORAGE_PREFIX=custom-prefix/`
- **Warning:** Cannot use `prod/` prefix in non-production environments

## Database Configuration

### `DATABASE_URL`
- **Type:** `string`
- **Required:** Yes
- **Description:** PostgreSQL connection string
- **Example:** `DATABASE_URL=postgresql://user:password@host:5432/database`
- **Security:** Must not contain production indicators when `NEXT_PUBLIC_ENV=staging`

## Authentication

### `JWT_SECRET`
- **Type:** `string`
- **Required:** Yes
- **Description:** Secret key for JWT token signing
- **Example:** `JWT_SECRET=your-super-secret-key-minimum-32-chars`

### `NEXTAUTH_SECRET`
- **Type:** `string`
- **Required:** Yes
- **Description:** Secret for NextAuth.js session encryption
- **Example:** `NEXTAUTH_SECRET=your-nextauth-secret-minimum-32-chars`

### `NEXTAUTH_URL`
- **Type:** `string`
- **Default:** `http://localhost:3000`
- **Description:** Canonical URL of the application
- **Example:** `NEXTAUTH_URL=https://staging.example.com`

## QuickBooks Integration

### `QB_CLIENT_ID`
- **Type:** `string`
- **Optional:** Yes
- **Description:** QuickBooks OAuth client ID
- **Example:** `QB_CLIENT_ID=ABcd1234...`

### `QB_CLIENT_SECRET`
- **Type:** `string`
- **Optional:** Yes
- **Description:** QuickBooks OAuth client secret
- **Example:** `QB_CLIENT_SECRET=xyz789...`

### `QB_REDIRECT_URI`
- **Type:** `string`
- **Optional:** Yes
- **Description:** OAuth callback URL for QuickBooks
- **Example:** `QB_REDIRECT_URI=https://staging.example.com/api/quickbooks/callback`

### `QB_SANDBOX_MODE`
- **Type:** `string`
- **Values:** `true` | `false`
- **Default:** `true`
- **Description:** Use QuickBooks sandbox environment
- **Example:** `QB_SANDBOX_MODE=false`

## Upload Configuration

### `UPLOAD_DIR`
- **Type:** `string`
- **Default:** `./public/uploads`
- **Description:** Local directory for file uploads (development only)
- **Example:** `UPLOAD_DIR=/var/uploads`

### `MAX_FILE_SIZE`
- **Type:** `number`
- **Default:** `10485760` (10MB)
- **Description:** Maximum file size in bytes
- **Example:** `MAX_FILE_SIZE=52428800` (50MB)

## Example Configuration Files

### Development (.env.local)
```env
NEXT_PUBLIC_ENV=development
STORAGE_PROVIDER=supabase
DATABASE_URL=postgresql://postgres:password@localhost:5432/ots_dev
JWT_SECRET=dev-secret-key-for-local-testing-only
NEXTAUTH_SECRET=dev-nextauth-secret-for-local-testing
NEXT_PUBLIC_SUPABASE_URL=https://local-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-key
```

### Staging (.env.staging)
```env
NEXT_PUBLIC_ENV=staging
STORAGE_PROVIDER=s3
S3_BUCKET=ots-arp-aws-staging-uploads
S3_REGION=us-east-2
DATABASE_URL=postgresql://staging-user:password@staging-db.amazonaws.com:5432/ots_staging
JWT_SECRET=staging-secret-key-minimum-32-characters
NEXTAUTH_SECRET=staging-nextauth-secret-minimum-32-chars
NEXTAUTH_URL=https://staging.ots-arp.com
QB_SANDBOX_MODE=true
```

### Production (.env.production)
```env
NEXT_PUBLIC_ENV=production
STORAGE_PROVIDER=s3
S3_BUCKET=ots-arp-aws-production-uploads
S3_REGION=us-east-2
S3_PUBLIC_URL=https://cdn.ots-arp.com
DATABASE_URL=postgresql://prod-user:password@prod-db.amazonaws.com:5432/ots_production
JWT_SECRET=production-secret-key-stored-in-secrets-manager
NEXTAUTH_SECRET=production-nextauth-secret-in-secrets-manager
NEXTAUTH_URL=https://app.ots-arp.com
QB_SANDBOX_MODE=false
```

## Security Notes

1. **Never commit `.env.local` or any file with real credentials to version control**
2. **Use AWS Secrets Manager or similar for production secrets**
3. **Rotate secrets regularly**
4. **Use different credentials for each environment**
5. **The environment isolation guard prevents staging from using production resources**

## Storage Provider Selection Logic

The storage provider is selected based on the following priority:
1. Explicit `STORAGE_PROVIDER` environment variable
2. Default based on `NEXT_PUBLIC_ENV`:
   - `staging` → S3
   - `production` → S3
   - `development` → Supabase
   - Other → Supabase

## File Upload Paths

All uploaded files are automatically prefixed with the environment:
- Production: `prod/category/filename.ext`
- Staging: `staging/category/filename.ext`
- Development: `dev/category/filename.ext`

This ensures complete isolation between environments and prevents accidental data mixing.