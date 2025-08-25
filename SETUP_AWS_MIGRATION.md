# 🚀 AWS Migration Setup Guide

This guide will help you migrate from Supabase/Coolify to AWS-only infrastructure.

## Current Situation
- You have code copied from a Coolify/Supabase project
- The code still has old environment variables
- You want to run everything on AWS instead

## Quick Start

### Step 1: Check AWS CLI
First, let's see if AWS CLI is configured:

```bash
aws sts get-caller-identity
```

If this fails, you need to configure AWS:
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Enter region: us-east-2
# Enter output format: json
```

### Step 2: Run Inventory Script
This will show what's currently configured (if anything):

```bash
node scripts/env/inventory-staging.mjs
```

This creates:
- `env-reports/staging-inventory.md` - Human-readable report
- `env-reports/staging-inventory.json` - Machine-readable data

**Open `env-reports/staging-inventory.md` to see:**
- 🚨 Any Supabase references found (need to remove)
- 📊 What AWS services are configured
- 🚀 Current Amplify settings

### Step 3: Run Validation Script
This checks if everything is configured correctly for AWS:

```bash
node scripts/env/validate-staging.mjs
```

This creates:
- `env-reports/staging-validation.md` - What needs to be fixed
- `env-reports/proposed-staging-env.json` - Suggested configuration

**Open `env-reports/staging-validation.md` to see:**
- ❌ Errors that MUST be fixed
- ⚠️ Warnings to consider
- ✅ What's already correct
- 🔧 Exact environment variables to set

## What You'll Need to Set Up

### 1. AWS RDS PostgreSQL Database
If not already created:
```bash
# This is what you need (example)
DATABASE_URL="postgresql://username:password@your-db.rds.amazonaws.com:5432/otsarpdb"
```

### 2. AWS S3 Bucket
For file storage:
```bash
AWS_S3_BUCKET="ots-arp-aws-staging-uploads"
STORAGE_PROVIDER="s3"
```

### 3. Remove ALL Supabase Variables
Delete these from everywhere:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- Any other `SUPABASE_*` variables

## Local Development Setup

### 1. Create Local Environment File
```bash
cp .env.local.example .env.local
```

### 2. Edit `.env.local` for Local Development
```env
# Local development (can use local PostgreSQL)
NEXT_PUBLIC_ENV=development
DATABASE_URL="postgresql://postgres:password@localhost:5432/otsarp_dev"

# Authentication
JWT_SECRET="your-dev-secret-key"
NEXTAUTH_SECRET="your-dev-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Storage (use S3 or local)
STORAGE_PROVIDER="s3"
AWS_S3_BUCKET="ots-arp-aws-dev"
AWS_REGION="us-east-2"

# If you have AWS credentials for local dev
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
```

### 3. Run Locally
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Common Issues & Solutions

### Issue: "No Amplify app found"
**Solution**: You haven't deployed to AWS Amplify yet. That's OK for local development.

### Issue: "No RDS instance found"
**Solution**: You need to create an RDS PostgreSQL database. For local dev, use Docker:
```bash
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=otsarp_dev \
  -p 5432:5432 \
  postgres:15
```

### Issue: "Supabase variables detected"
**Solution**: Remove all Supabase environment variables from:
- `.env.local`
- AWS Amplify environment variables
- Any deployment configurations

## What Happens Next?

1. **Run the inventory script** - See what's there
2. **Run the validation script** - See what needs fixing
3. **Fix the issues** - Usually just setting environment variables
4. **Run locally** - Test with `npm run dev`
5. **Deploy to AWS** - Once local works, deploy to Amplify

## Need Help?

If the validation script shows errors:
1. Copy the error from `env-reports/staging-validation.md`
2. Share it here and I'll help you fix it
3. Most errors are just missing environment variables

The scripts will tell you EXACTLY what needs to be changed!