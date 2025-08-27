# Coolify Environment Variables Setup

## EXACT Format for Coolify Environment Variables

Copy and paste these EXACTLY as shown into your Coolify environment variables:

```
DATABASE_URL=postgresql://postgres.xudcmdliqyarbfdqufbq:yJ4E5uvqd42Svz97@aws-0-us-east-2.pooler.supabase.com:6543/postgres

JWT_SECRET=cwlLQt/XMM9uLCOmP+XKA2l8UUb7PKNVSBQ0zW3T1gIA6Qs9Ypw0a3n66Rsp4buGYHTz6//wshSFaKE/CddnBw==

NEXTAUTH_SECRET=cwlLQt/XMM9uLCOmP+XKA2l8UUb7PKNVSBQ0zW3T1gIA6Qs9Ypw0a3n66Rsp4buGYHTz6//wshSFaKE/CddnBw==

NEXTAUTH_URL=https://ortmeier.111consultinggroup.com

NEXT_PUBLIC_SUPABASE_URL=https://xudcmdliqyarbfdqufbq.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZGNtZGxpcXlhcmJmZHF1ZmJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MzgzMzUsImV4cCI6MjA2NTQxNDMzNX0.wf9YrjJShp1xrv7pw60u4cyJ7ljjAPIS0bIVBmDsOvs

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZGNtZGxpcXlhcmJmZHF1ZmJxIiwicm9sZSI6InNlcmlZmNlX3JvbGUiLCJpYXQiOjE3NDk4MzgzMzUsImV4cCI6MjA2NTQxNDMzNX0._Pg8zzVMfNb--KpooQL7Q2V17gD4ilylIlKRt3nbGZE
```

## Important Notes:

1. **DO NOT include quotes around the values** in Coolify
2. **Variable names must be EXACT** (case-sensitive):
   - `SUPABASE_SERVICE_ROLE_KEY` (not "supabase service role key")
   - `NEXT_PUBLIC_SUPABASE_URL` (must have NEXT_PUBLIC_ prefix)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (must have NEXT_PUBLIC_ prefix)

## How to Add in Coolify:

1. Go to your Coolify application
2. Click on "Environment Variables" or "Secrets"
3. Add each line above as a separate environment variable
4. Make sure there are NO extra spaces or quotes
5. Click "Save"
6. **Redeploy the application**

## Missing Variables You Need to Add:

Based on what you told me, you're missing these:
- `NEXTAUTH_SECRET` (same value as JWT_SECRET)
- `NEXTAUTH_URL` (your production URL)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Verify After Deployment:

After adding these and redeploying, check the browser console when uploading a file. You should see:
```
Supabase URL exists: true
Service key exists: true
Anon key exists: true
```

If any show `false`, that variable is not set correctly in Coolify.