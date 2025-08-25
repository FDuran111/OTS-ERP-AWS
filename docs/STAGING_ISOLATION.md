# Staging Environment Isolation

This document describes the staging environment isolation features that prevent accidental connections to production resources.

## Features

### 1. Visual Staging Banner
A prominent banner appears at the top of all pages when running in staging mode (`NEXT_PUBLIC_ENV=staging`).

**Location:** `src/components/layout/StagingRibbon.tsx`

**Features:**
- Bright animated gradient background (red/yellow)
- "STAGING – TEST DATA ONLY" text
- Fixed position at top of viewport
- Z-index 9999 to ensure visibility
- Responsive design for mobile

### 2. Environment Isolation Guard
Prevents staging environment from connecting to production resources.

**Location:** `src/lib/assertEnvIsolation.ts`

**How it works:**
1. Checks if `NEXT_PUBLIC_ENV === 'staging'`
2. Scans all connection strings and URLs for production indicators
3. Throws error if any production resources are detected
4. Prevents application startup until resolved

**Production Indicators:**
- `prod`
- `production`
- `live`
- `prd`

**Checked Environment Variables:**
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `AWS_S3_BUCKET`
- `STORAGE_BUCKET`
- `NEXT_PUBLIC_API_URL`
- `NEXTAUTH_URL`
- `QB_REDIRECT_URI`

### 3. Integration Points

#### Database Connection (`src/lib/db.ts`)
```typescript
import { assertEnvIsolation, logEnvIsolationStatus } from './assertEnvIsolation'

// Check environment isolation before initializing database
assertEnvIsolation()
logEnvIsolationStatus()
```

#### File Storage (`src/lib/file-storage.ts`)
```typescript
import { assertEnvIsolation } from './assertEnvIsolation'

// Check environment isolation before initializing file storage
assertEnvIsolation()
```

## Usage

### Setting Up Staging Environment

1. Copy the staging environment template:
```bash
cp .env.staging.example .env.local
```

2. Update all URLs to use staging resources:
```env
NEXT_PUBLIC_ENV=staging
DATABASE_URL="postgresql://staging-db.example.com/db"
NEXT_PUBLIC_SUPABASE_URL="https://staging.supabase.co"
```

3. Start the application:
```bash
npm run dev
```

### Testing Environment Isolation

Run the unit tests:
```bash
npm run test:env
```

### Monitoring

The isolation status is logged at startup:
- ✅ "Environment isolation check passed: Staging is properly isolated"
- ❌ "Environment isolation check failed: [violations]"

## Error Messages

If staging points to production, you'll see:
```
🚨 ENVIRONMENT ISOLATION VIOLATION DETECTED 🚨

Staging environment is configured to connect to production resources!
This is a critical security issue that must be fixed immediately.

Violations detected:
  ❌ DATABASE_URL contains production indicators
  ❌ NEXT_PUBLIC_SUPABASE_URL contains production indicators

Current environment: staging

To fix this:
1. Ensure all staging environment variables point to staging resources
2. Check your .env.local or environment configuration
3. Never use production credentials in staging

The application will not start until this is resolved.
```

## Benefits

1. **Visual Clarity**: No confusion about which environment you're in
2. **Data Protection**: Prevents accidental modifications to production data
3. **Security**: Prevents staging from accessing production credentials
4. **Compliance**: Helps maintain environment separation for auditing
5. **Developer Safety**: Fail-fast approach prevents mistakes

## Troubleshooting

### Banner Not Showing
- Check `NEXT_PUBLIC_ENV` is set to `staging`
- Verify `StagingRibbon` is imported in `app/layout.tsx`
- Check browser console for errors

### False Positive Violations
If you have legitimate staging URLs that contain "prod" (e.g., `staging-product-db`):
1. Consider renaming the resource
2. Or modify `PROD_INDICATORS` in `assertEnvIsolation.ts`

### Application Won't Start
1. Check the error message for specific violations
2. Update the flagged environment variables
3. Ensure no production URLs in `.env.local`
4. Run `npm run test:env` to verify configuration

## CI/CD Integration

In your deployment pipeline:

```yaml
# GitHub Actions example
- name: Set staging environment
  run: |
    echo "NEXT_PUBLIC_ENV=staging" >> $GITHUB_ENV
    
- name: Verify environment isolation
  run: |
    npm run test:env
```

## Security Notes

- Never commit `.env.local` to version control
- Use separate credentials for each environment
- Rotate staging credentials regularly
- Monitor access logs for both environments
- Use least-privilege access for staging resources