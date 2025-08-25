#!/bin/bash

# Prepare for AWS Deployment
# This script prepares the application for deployment to AWS (staging/production)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🚀 AWS Deployment Preparation"
echo "============================="
echo ""

# 1. Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}Current branch:${NC} $CURRENT_BRANCH"

if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "staging" ]]; then
    echo -e "${YELLOW}Warning: You're not on main or staging branch${NC}"
    echo "Consider switching to main for production or staging for staging deployment"
fi

# 2. Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
    git status -s
    echo ""
    read -p "Do you want to commit these changes? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "Prepare for AWS deployment"
    fi
fi

# 3. Create database migration script
echo ""
echo -e "${GREEN}Creating consolidated database migration script...${NC}"
cat > scripts/aws-db-migration.sql << 'EOF'
-- AWS RDS Database Migration Script
-- Run this on your RDS instance after it's created

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Include all schema from init-complete-db.sql
EOF

# Append the complete database schema
cat scripts/init-complete-db.sql >> scripts/aws-db-migration.sql

# Add all the fixes we applied
cat >> scripts/aws-db-migration.sql << 'EOF'

-- Additional columns and fixes applied during local development
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "jobNumber" VARCHAR(50);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "customerId" UUID REFERENCES "Customer"(id);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "billedAmount" DECIMAL(10,2);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'SERVICE';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "estimatedCost" DECIMAL(10,2);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "actualCost" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "estimatedHours" DECIMAL(10,2);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "jobType" VARCHAR(50);
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "scheduledStart" TIMESTAMP;

-- Update Job data
UPDATE "Job" SET 
    "jobNumber" = COALESCE("jobNumber", job_number),
    "customerId" = COALESCE("customerId", customer_id),
    "billedAmount" = COALESCE("billedAmount", billed_amount, 0),
    "totalAmount" = COALESCE("totalAmount", "billedAmount", 0),
    "estimatedHours" = COALESCE("estimatedHours", estimated_hours, 8),
    "jobType" = COALESCE("jobType", type, 'SERVICE'),
    "scheduledStart" = COALESCE("scheduledStart", scheduled_date::timestamp, "createdAt");

-- Material columns
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "inStock" INTEGER;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "minStock" INTEGER;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS markup DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "vendorId" UUID;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Material" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Customer columns
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(255);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(255);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "companyName" VARCHAR(255);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "quickbooksId" VARCHAR(100);

-- Invoice columns
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "invoiceNumber" VARCHAR(50);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "jobId" UUID REFERENCES "Job"(id);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "customerId" UUID REFERENCES "Customer"(id);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "totalAmount" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidDate" DATE;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "dueDate" DATE;

-- Lead columns
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(255);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(255);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "companyName" VARCHAR(255);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "estimatedValue" DECIMAL(10,2);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastContactDate" DATE;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "nextFollowUpDate" DATE;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "assignedTo" UUID;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

EOF

# Append all the CREATE TABLE scripts
for script in scripts/fix-missing-tables.sql scripts/create-job-categorization-tables.sql scripts/create-material-tables.sql scripts/create-company-assets-tables.sql; do
    if [ -f "$script" ]; then
        echo "-- From $script" >> scripts/aws-db-migration.sql
        cat "$script" >> scripts/aws-db-migration.sql
        echo "" >> scripts/aws-db-migration.sql
    fi
done

echo -e "${GREEN}✓ Database migration script created: scripts/aws-db-migration.sql${NC}"

# 4. Check environment variables
echo ""
echo -e "${BLUE}Required AWS Environment Variables:${NC}"
echo "For staging deployment, you need to set these in GitHub Secrets:"
echo ""
echo "  ${YELLOW}AWS_DEPLOYER_ROLE_ARN${NC} - IAM role for deployments"
echo "  ${YELLOW}DATABASE_URL${NC} - RDS PostgreSQL connection string"
echo "  ${YELLOW}S3_BUCKET${NC} - S3 bucket for file storage"
echo "  ${YELLOW}S3_REGION${NC} - AWS region (us-east-2)"
echo "  ${YELLOW}JWT_SECRET${NC} - Secret for JWT tokens"
echo ""

# 5. Build test
echo -e "${BLUE}Testing production build...${NC}"
npm run build || {
    echo -e "${RED}Build failed! Fix errors before deploying.${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}✅ Application is ready for AWS deployment!${NC}"
echo ""
echo "Next steps:"
echo "1. Review and commit all changes"
echo "2. Push to GitHub (main or staging branch)"
echo "3. GitHub Actions will automatically deploy to AWS"
echo "4. After RDS is created, run: scripts/aws-db-migration.sql on the database"
echo "5. Run smoke tests: npm run smoke:staging"
echo ""
echo "To manually trigger infrastructure deployment:"
echo "  Go to GitHub Actions → Deploy Staging Infrastructure → Run workflow"
echo "  Or commit with message containing: [deploy-infra]"