# File Upload Fix - Supabase Storage

## Problem

Files were uploading but showing as 0kb and giving 404 errors when trying to view them.

## Root Cause

The upload code was still importing from `@/lib/aws-s3` instead of `@/lib/supabase-storage`, causing:
1. Wrong file path generation (no environment prefix)
2. Wrong bucket name references
3. Files not actually uploading to Supabase Storage

## Files Fixed

1. **src/app/api/jobs/[id]/upload/route.ts**
   - Changed imports from `aws-s3` to `supabase-storage`
   - Updated bucket name from `AWS_S3_BUCKET` to `STORAGE_BUCKET`
   - Fixed file size error message to use `MAX_FILE_SIZE`

2. **src/app/api/files/[fileId]/[id]/route.ts**
   - Changed from `deleteFromS3()` to `storage.delete()`
   - Now uses storage adapter for file deletion

## What Changed

### Before (Broken)
```typescript
import { generateJobFileKey } from '@/lib/aws-s3'
// ...
process.env.AWS_S3_BUCKET  // ← undefined in Render!
```

### After (Fixed)
```typescript
import { generateJobFileKey } from '@/lib/supabase-storage'
// ...
process.env.STORAGE_BUCKET || 'uploads'  // ← correct!
```

## Deployment Steps

1. **Commit the changes**:
   ```bash
   cd /Users/franciscoduran/Developer/OTS-ERP

   git add src/app/api/jobs/[id]/upload/route.ts
   git add src/app/api/files/[fileId]/[id]/route.ts
   git add FILE_UPLOAD_FIX.md

   git commit -m "fix: Use Supabase Storage for file uploads instead of S3"
   git push origin main
   ```

2. **Wait for Render to deploy** (5-10 minutes)
   - Watch: https://dashboard.render.com/
   - Check build logs for success

3. **Test file upload**:
   - Go to: https://ortmeiertechnicalservices.warroomtech.co
   - Upload a file to a job
   - Verify file appears correctly
   - Click to download/view
   - Should work now!

## Expected Behavior After Fix

### File Upload
1. File uploads to Supabase Storage bucket: `uploads`
2. Path format: `dev/jobs/{jobId}/photo/{timestamp}_{filename}`
3. URL format: `https://xudcmdliqyarbfdqufbq.supabase.co/storage/v1/object/sign/uploads/...`

### File Download
1. Click file → Gets signed URL from Supabase
2. URL valid for 1 hour
3. File downloads/displays correctly

## Verification Checklist

After deployment:

- [ ] Can upload image file
- [ ] Can upload PDF file
- [ ] Thumbnail generates for images
- [ ] File shows correct size (not 0kb)
- [ ] Can view/download uploaded files
- [ ] No 404 errors in console
- [ ] No 500 errors in console

## If Still Not Working

### Check Render Logs
```
Dashboard → Your Service → Logs
```

Look for:
- `Supabase not configured` - Missing env vars
- `Supabase upload failed` - RLS policy issue
- Other upload errors

### Verify Environment Variables in Render

All these must be set:
```
STORAGE_PROVIDER=supabase
STORAGE_BUCKET=uploads
NEXT_PUBLIC_SUPABASE_URL=https://xudcmdliqyarbfdqufbq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-key]
```

### Check Supabase Storage Bucket

1. Go to: https://supabase.com/dashboard/project/xudcmdliqyarbfdqufbq/storage/buckets
2. Click `uploads` bucket
3. You should see folder structure: `dev/jobs/...` or `prod/jobs/...`
4. Files should appear there after upload

### Check RLS Policies

Go to: https://supabase.com/dashboard/project/xudcmdliqyarbfdqufbq/storage/buckets/uploads

Policies should allow:
- ✅ INSERT for authenticated users
- ✅ SELECT for authenticated users
- ✅ UPDATE for authenticated users
- ✅ DELETE for authenticated users

If policies are too restrictive, update them in Supabase dashboard.

## Rollback (If Needed)

If this causes issues, revert with:
```bash
git revert HEAD
git push origin main
```

Render will auto-deploy the revert in 5-10 minutes.

---

**Status**: Ready to deploy ✅
**Risk**: Low (only fixes file uploads)
**Impact**: Critical (fixes broken file uploads)
