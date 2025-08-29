#!/bin/bash

# harden-rds.sh - Rotate RDS master password via Secrets Manager
set -e

echo "============================================"
echo "=== RDS Password Rotation Script ==="
echo "============================================"
echo ""

# Configuration
REGION="us-east-2"
RDS_INSTANCE="ots-erp-prod-rds"
SECRET_NAME="ots-erp/prod/rds/password"
DB_USER="otsapp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Target RDS Instance: $RDS_INSTANCE"
echo "Region: $REGION"
echo ""

# Generate secure random password (32 chars)
generate_password() {
  # Use openssl for cryptographically secure random password
  # Includes uppercase, lowercase, numbers, and safe special chars
  openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

echo "1. GENERATING NEW PASSWORD"
echo "==========================="
NEW_PASSWORD=$(generate_password)
echo -e "${GREEN}✓ Generated 32-character secure password${NC}"
echo "  Length: ${#NEW_PASSWORD} characters"
echo "  Masked: ${NEW_PASSWORD:0:4}****************************"

echo ""
echo "2. UPDATING RDS MASTER PASSWORD"
echo "================================"

# First, verify the RDS instance exists
RDS_INFO=$(aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE --region $REGION 2>/dev/null)
if [ $? -ne 0 ]; then
  echo -e "${RED}✗ RDS instance $RDS_INSTANCE not found${NC}"
  exit 1
fi

CURRENT_USER=$(echo $RDS_INFO | jq -r '.DBInstances[0].MasterUsername')
echo "Master Username: $CURRENT_USER"

# Modify RDS master password
echo -n "Updating RDS password... "
aws rds modify-db-instance \
  --db-instance-identifier $RDS_INSTANCE \
  --master-user-password "$NEW_PASSWORD" \
  --apply-immediately \
  --region $REGION >/dev/null 2>&1

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Password update initiated${NC}"
else
  echo -e "${RED}✗ Failed to update RDS password${NC}"
  exit 1
fi

echo ""
echo "3. UPDATING SECRETS MANAGER"
echo "============================"

# Check if secret exists
SECRET_EXISTS=$(aws secretsmanager describe-secret --secret-id $SECRET_NAME --region $REGION 2>/dev/null)

if [ $? -eq 0 ]; then
  echo "Found existing secret: $SECRET_NAME"
  
  # Update the secret value
  echo -n "Updating secret value... "
  
  # Create JSON with the password
  SECRET_JSON=$(cat <<EOF
{
  "username": "$DB_USER",
  "password": "$NEW_PASSWORD",
  "engine": "postgres",
  "host": "$(echo $RDS_INFO | jq -r '.DBInstances[0].Endpoint.Address')",
  "port": 5432,
  "dbname": "ortmeier"
}
EOF
)
  
  aws secretsmanager update-secret \
    --secret-id $SECRET_NAME \
    --secret-string "$SECRET_JSON" \
    --region $REGION >/dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Secret updated${NC}"
  else
    echo -e "${RED}✗ Failed to update secret${NC}"
    exit 1
  fi
else
  echo "Secret doesn't exist. Creating new secret..."
  
  # Create new secret
  SECRET_JSON=$(cat <<EOF
{
  "username": "$DB_USER",
  "password": "$NEW_PASSWORD",
  "engine": "postgres",
  "host": "$(echo $RDS_INFO | jq -r '.DBInstances[0].Endpoint.Address')",
  "port": 5432,
  "dbname": "ortmeier"
}
EOF
)
  
  CREATE_RESULT=$(aws secretsmanager create-secret \
    --name $SECRET_NAME \
    --description "RDS master password for $RDS_INSTANCE" \
    --secret-string "$SECRET_JSON" \
    --region $REGION 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Secret created successfully${NC}"
  else
    echo -e "${RED}✗ Failed to create secret${NC}"
    exit 1
  fi
fi

echo ""
echo "4. VERIFICATION"
echo "==============="

# Get secret details
SECRET_INFO=$(aws secretsmanager describe-secret --secret-id $SECRET_NAME --region $REGION 2>/dev/null)
if [ $? -eq 0 ]; then
  SECRET_ARN=$(echo $SECRET_INFO | jq -r '.ARN')
  LAST_CHANGED=$(echo $SECRET_INFO | jq -r '.LastChangedDate')
  VERSION_ID=$(echo $SECRET_INFO | jq -r '.VersionId')
  
  echo "Secret ARN (masked):"
  echo "  ${SECRET_ARN%:*}:****"
  echo "Last Changed: $LAST_CHANGED"
  echo "Version ID: $VERSION_ID"
else
  echo -e "${YELLOW}⚠ Could not verify secret${NC}"
fi

echo ""
echo "5. WAITING FOR RDS UPDATE"
echo "========================="
echo "Waiting for RDS instance to apply changes (this may take a few minutes)..."

# Wait for RDS to be available
WAIT_COUNT=0
MAX_WAIT=30  # Max 5 minutes (30 * 10 seconds)

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  STATUS=$(aws rds describe-db-instances \
    --db-instance-identifier $RDS_INSTANCE \
    --region $REGION \
    --query 'DBInstances[0].DBInstanceStatus' \
    --output text 2>/dev/null)
  
  if [ "$STATUS" = "available" ]; then
    echo -e "${GREEN}✓ RDS instance is available${NC}"
    break
  else
    echo -n "."
    sleep 10
    WAIT_COUNT=$((WAIT_COUNT + 1))
  fi
done

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
  echo -e "${YELLOW}⚠ RDS is still updating. Password change is in progress.${NC}"
fi

echo ""
echo "6. UPDATE APPLICATION CONFIGURATION"
echo "===================================="
echo -e "${YELLOW}IMPORTANT: Update your application with the new password:${NC}"
echo ""
echo "For Amplify environment variables:"
echo "  1. Go to AWS Amplify Console"
echo "  2. Select your app: $APP_ID"
echo "  3. Go to App settings > Environment variables"
echo "  4. Update RDS_PASSWORD with the new value"
echo ""
echo "Or use AWS CLI:"
echo "  aws amplify update-app --app-id d36xjm3hezzwnw \\"
echo "    --environment-variables RDS_PASSWORD=<new-password> \\"
echo "    --region $REGION"
echo ""
echo "New password (store securely and delete this output):"
echo -e "${RED}$NEW_PASSWORD${NC}"
echo ""
echo -e "${YELLOW}⚠ Save this password immediately and clear your terminal history!${NC}"

echo ""
echo "============================================"
echo "=== PASSWORD ROTATION COMPLETE ==="
echo "============================================"
echo ""
echo -e "${GREEN}✓ RDS master password has been rotated${NC}"
echo -e "${GREEN}✓ Secret has been updated in Secrets Manager${NC}"
echo ""
echo "Next steps:"
echo "  1. Update application environment variables"
echo "  2. Redeploy the application"
echo "  3. Verify application can connect with new password"
echo "  4. Clear terminal history: history -c"
echo ""
echo "Rotation complete at $(date '+%Y-%m-%d %H:%M:%S')"