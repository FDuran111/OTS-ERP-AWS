# Production Environment Variables Required

## Critical Environment Variables for File Upload

You need to set these environment variables in your production deployment (Vercel, Netlify, Railway, Render, etc.):

```bash
# Supabase Configuration (REQUIRED for file uploads)
NEXT_PUBLIC_SUPABASE_URL="https://xudcmdliqyarbfdqufbq.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZGNtZGxpcXlhcmJmZHF1ZmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MzgzMzUsImV4cCI6MjA2NTQxNDMzNX0.wf9YrjJShp1xrv7pw60u4cyJ7ljjAPIS0bIVBmDsOvs"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZGNtZGxpcXlhcmJmZHF1ZmJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTgzODMzNSwiZXhwIjoyMDY1NDE0MzM1fQ._Pg8zzVMfNb--KpooQL7Q2V17gD4ilylIlKRt3nbGZE"

# Database
DATABASE_URL="postgresql://postgres.xudcmdliqyarbfdqufbq:yJ4E5uvqd42Svz97@aws-0-us-east-2.pooler.supabase.com:6543/postgres"

# Authentication (MUST be the same as development for existing users to work)
JWT_SECRET="cwlLQt/XMM9uLCOmP+XKA2l8UUb7PKNVSBQ0zW3T1gIA6Qs9Ypw0a3n66Rsp4buGYHTz6//wshSFaKE/CddnBw=="
NEXTAUTH_SECRET="cwlLQt/XMM9uLCOmP+XKA2l8UUb7PKNVSBQ0zW3T1gIA6Qs9Ypw0a3n66Rsp4buGYHTz6//wshSFaKE/CddnBw=="
NEXTAUTH_URL="https://your-production-domain.com"  # Update this to your actual domain
```

## How to Add These to Your Deployment Platform

### Vercel
1. Go to your project dashboard
2. Click on "Settings" tab
3. Click on "Environment Variables"
4. Add each variable above
5. Redeploy your application

### Netlify
1. Go to Site Settings
2. Click on "Environment variables"
3. Add each variable above
4. Trigger a new deploy

### Railway
1. Go to your project
2. Click on "Variables" tab
3. Add each variable above
4. Railway will automatically redeploy

### Render
1. Go to your service dashboard
2. Click on "Environment" in the left sidebar
3. Add each variable above
4. Click "Save Changes" and redeploy

## Important Notes

1. **SUPABASE_SERVICE_ROLE_KEY is CRITICAL** - Without this, file uploads will fail with "Storage configuration missing"
2. All three Supabase variables must be set together
3. The JWT_SECRET must match what was used in development for existing users to be able to login
4. Update NEXTAUTH_URL to your actual production domain

## Testing After Deployment

After setting these environment variables and redeploying:
1. Try uploading a file to a job
2. Check the browser console - you should see the debug logs showing which keys exist
3. Once working, you can remove the debug console.log statements from the upload handler