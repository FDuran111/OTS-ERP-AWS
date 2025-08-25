# 🚀 Local Development Setup (AWS-Style)

This guide sets up local development that mirrors AWS infrastructure without touching staging/production.

## ⚡ Quick Start (60 seconds)

```bash
# 1. Set up local services (PostgreSQL + LocalStack S3)
./scripts/setup-local-dev.sh

# 2. Start development server with hot-reload
npm run dev

# 3. Open browser
# http://localhost:3000
```

That's it! You now have live hot-reload development.

## 📋 What This Does

- **PostgreSQL**: Local database (like RDS)
- **LocalStack**: Local S3 (like AWS S3)
- **Hot Reload**: Instant updates when you save files
- **AWS-Style**: Same storage patterns as production

## 🔍 Step 1: Check AWS Staging (Optional)

If you want to see what's configured in AWS:

```bash
# Check AWS CLI is working
aws sts get-caller-identity

# See what's in AWS (if anything)
node scripts/env/inventory-staging.mjs

# Validate configuration
node scripts/env/validate-staging.mjs

# View reports
cat env-reports/staging-validation.md
```

**If validation shows ❌ errors**, share the output and we'll fix them.

## 🏠 Step 2: Local Development Setup

### Prerequisites
- Docker Desktop installed and running
- Node.js 18+ installed
- Git

### Automatic Setup
```bash
# This script does everything for you
./scripts/setup-local-dev.sh
```

### Manual Setup (if script fails)

1. **Copy environment file**:
```bash
cp .env.local.example .env.local
```

2. **Start PostgreSQL**:
```bash
docker run -d \
  --name postgres-ots \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ots_dev \
  -p 5432:5432 \
  postgres:15
```

3. **Start LocalStack (S3)**:
```bash
docker run -d \
  --name localstack-ots \
  -e SERVICES=s3 \
  -e DEFAULT_REGION=us-east-2 \
  -p 4566:4566 \
  localstack/localstack:latest

# Create bucket
docker exec localstack-ots awslocal s3 mb s3://ots-arp-aws-dev-files
```

4. **Install dependencies**:
```bash
npm install
```

## 🔥 Step 3: Run with Hot Reload

```bash
npm run dev
```

Now you can:
- Edit React components → See changes instantly
- Edit API routes → Quick rebuild
- Edit styles → Instant updates

## ✅ Step 4: Verify It's Working

```bash
# Check health
curl http://localhost:3000/api/health

# Should return:
# {"ok":true,"environment":"development",...}
```

## 🎯 Important Configuration Notes

### What We Changed from Original

| Old (Supabase/Coolify) | New (AWS) |
|------------------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ❌ REMOVED |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ REMOVED |
| `NEXTAUTH_SECRET` | ❌ REMOVED (not using NextAuth) |
| `DATABASE_URL` → Supabase | `DATABASE_URL` → Local PostgreSQL |
| Storage → Supabase | Storage → LocalStack S3 |

### Environment Variables Explained

```env
# These tell the app we're in dev mode
NEXT_PUBLIC_ENV=development  # Not "staging" locally!
NODE_ENV=development

# Local PostgreSQL (like RDS)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ots_dev

# LocalStack S3 (like AWS S3)
STORAGE_PROVIDER=s3  # Always s3, not supabase
S3_BUCKET=ots-arp-aws-dev-files  # Note: S3_BUCKET not AWS_S3_BUCKET
S3_ENDPOINT=http://localhost:4566  # LocalStack endpoint
S3_FORCE_PATH_STYLE=true  # Required for LocalStack

# Simple JWT auth (no NextAuth)
JWT_SECRET=dev-secret-dont-use-in-prod
```

## 🚨 Common Issues & Fixes

### "Cannot connect to database"
```bash
# Check PostgreSQL is running
docker ps | grep postgres-ots

# If not, start it:
docker start postgres-ots
```

### "S3 upload fails"
```bash
# Check LocalStack is running
docker ps | grep localstack-ots

# If not, start it:
docker start localstack-ots
```

### "Still seeing old Supabase data"
Your `.env.local` still has Supabase URLs. Check:
```bash
cat .env.local | grep -i supabase
# Should return nothing!
```

### "Port 5432 already in use"
You have another PostgreSQL running:
```bash
# Stop other PostgreSQL
brew services stop postgresql  # Mac
sudo systemctl stop postgresql  # Linux
```

## 📤 Step 5: Deploy to AWS Staging

When your local changes work:

```bash
# Create feature branch
git checkout -b feature/my-change

# Make changes, test locally
npm run dev

# Commit when ready
git add .
git commit -m "Add my feature"

# Push to GitHub
git push origin feature/my-change

# Create PR → Merge to main → Auto-deploys to AWS
```

## 🧪 Testing Commands

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Build production bundle (test)
npm run build
```

## 🛑 Stopping Services

When done developing:

```bash
# Stop services
docker stop postgres-ots localstack-ots

# Remove containers (optional)
docker rm postgres-ots localstack-ots
```

## 📊 What Success Looks Like

✅ `npm run dev` starts without errors
✅ http://localhost:3000 loads
✅ `/api/health` returns `{"ok": true}`
✅ No Supabase references in `.env.local`
✅ Changes to components update instantly

## Need Help?

1. Run validation: `node scripts/env/validate-staging.mjs`
2. Share any ❌ errors you see
3. Most issues are just wrong environment variables

Remember: Keep `NEXT_PUBLIC_ENV=development` for local dev!