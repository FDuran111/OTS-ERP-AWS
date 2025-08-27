# Supabase Usage Inventory

## Direct Supabase References

| File Path | Line Numbers | Import Style | What It Does |
|-----------|--------------|--------------|--------------|
| src/lib/supabase.ts | 1, 3-7, 19-20 | @supabase/supabase-js | Main Supabase client creation and RPC query wrapper |
| src/lib/supabase-storage.ts | 1, 7, 10-30, 37, 50, 55, 78, 100, 111-129, 174-182, 207-241, 252, 273 | @supabase/supabase-js | Complete storage service implementation |
| src/app/api/files/upload-handler/route.ts | 3, 30-44 | Custom supabase-storage.ts | File upload handler using Supabase storage |
| src/app/api/jobs/[id]/bid-sheet/pdf/route.ts | 227 | Environment check | Checks for SUPABASE_SERVICE_ROLE_KEY |
| src/app/api/files/[fileId]/route.ts | 52 | Environment check | Checks for SUPABASE_SERVICE_ROLE_KEY |
| test-supabase-client.js | 1, 3-4, 6-42 | @supabase/supabase-js | Test script for Supabase connection |

## Supabase Configuration Details

### URLs and Keys
- **Supabase URL**: `https://xudcmdliqyarbfdqufbq.supabase.co` (hardcoded in multiple files)
- **Service Role Key**: Referenced via `process.env.SUPABASE_SERVICE_ROLE_KEY`
- **Anon Key**: Referenced via `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Public URL**: Referenced via `process.env.NEXT_PUBLIC_SUPABASE_URL`

### Storage Buckets and Paths
- **Main bucket**: `uploads`
- **Thumbnail bucket**: `thumbnails`
- **Categories/Paths**:
  - `jobs/` - Job-related files
  - `customers/` - Customer documents
  - `materials/` - Material documentation
  - `documents/` - General documents

### Supabase-Specific Features
- RPC function calls for raw SQL execution (src/lib/supabase.ts:20)
- Storage bucket creation with MIME type restrictions
- Public URL generation for stored files
- Signed URL generation for temporary access

## Environment Variables (Supabase-related)

| Variable Name | Used In | Purpose |
|---------------|---------|---------|
| SUPABASE_SERVICE_ROLE_KEY | src/lib/supabase.ts, src/lib/supabase-storage.ts | Server-side authentication |
| NEXT_PUBLIC_SUPABASE_URL | src/lib/supabase-storage.ts | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Documentation only | Client-side authentication |

## Refactor Plan Summary

1. **Database queries** (src/lib/supabase.ts) → Use existing pg pool in src/lib/db.ts directly
2. **File storage service** (src/lib/supabase-storage.ts) → Create new AWS S3 storage service with same interface
3. **Storage buckets** → Map to S3 bucket with prefixes: `s3://bucket/jobs/`, `s3://bucket/customers/`, etc.
4. **Public URLs** → Generate S3 public URLs or CloudFront URLs
5. **Signed URLs** → Use S3 presigned URLs with same expiration logic
6. **File upload handler** (upload-handler/route.ts) → Switch to S3 service, maintain same API contract
7. **RPC function calls** → Remove, use direct pg queries instead
8. **Storage initialization** → Create S3 bucket structure with proper CORS and policies
9. **Thumbnail generation** → Use AWS Lambda for serverless image processing or maintain client-side
10. **Environment checks** → Replace SUPABASE_SERVICE_ROLE_KEY checks with AWS credential checks