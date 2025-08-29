#!/bin/bash

# verify-live.sh - Verify the live temporary Amplify + RDS setup
set -e

echo "============================================"
echo "=== OTS-ERP Live Setup Verification ==="
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REGION="us-east-2"
APP_ID="d36xjm3hezzwnw"
BRANCH="main"
RDS_INSTANCE="ots-erp-prod-rds"
S3_BUCKET="ots-erp-prod-uploads"

echo "1. AMPLIFY STATUS"
echo "=================="
echo "App ID: $APP_ID"
echo "Branch: $BRANCH"

# Get Amplify app details
APP_INFO=$(aws amplify get-app --app-id $APP_ID --region $REGION 2>/dev/null || echo "ERROR")
if [ "$APP_INFO" != "ERROR" ]; then
  APP_NAME=$(echo $APP_INFO | jq -r '.app.name')
  DEFAULT_DOMAIN=$(echo $APP_INFO | jq -r '.app.defaultDomain')
  echo "App Name: $APP_NAME"
  echo "Default Domain: $DEFAULT_DOMAIN"
  
  # Get branch details
  BRANCH_INFO=$(aws amplify get-branch --app-id $APP_ID --branch-name $BRANCH --region $REGION 2>/dev/null)
  if [ $? -eq 0 ]; then
    LAST_DEPLOY=$(echo $BRANCH_INFO | jq -r '.branch.updateTime')
    STAGE=$(echo $BRANCH_INFO | jq -r '.branch.stage')
    echo "Stage: $STAGE"
    echo "Last Deploy: $(date -r ${LAST_DEPLOY%.*} '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo $LAST_DEPLOY)"
  fi
  
  # Get latest job
  JOBS=$(aws amplify list-jobs --app-id $APP_ID --branch-name $BRANCH --region $REGION --max-items 1 2>/dev/null)
  if [ $? -eq 0 ]; then
    JOB_STATUS=$(echo $JOBS | jq -r '.jobSummaries[0].status' 2>/dev/null || echo "UNKNOWN")
    echo -e "Latest Build Status: ${GREEN}$JOB_STATUS${NC}"
  fi
else
  echo -e "${RED}Failed to get Amplify app info${NC}"
fi

echo ""
echo "2. HEALTH CHECK"
echo "================"
AMPLIFY_URL="https://${BRANCH}.${APP_ID}.amplifyapp.com"
echo "Testing: $AMPLIFY_URL/api/health"

# Function to test health endpoint
test_health() {
  local attempt=$1
  echo -n "Attempt $attempt/3: "
  
  RESPONSE=$(curl -s -w "\n%{http_code}" "$AMPLIFY_URL/api/health" 2>/dev/null | tail -1)
  
  if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Health check passed (HTTP 200)${NC}"
    HEALTH_BODY=$(curl -s "$AMPLIFY_URL/api/health" 2>/dev/null)
    if echo "$HEALTH_BODY" | jq . 2>/dev/null; then
      echo "Response: $HEALTH_BODY"
    fi
    return 0
  elif [ "$RESPONSE" = "307" ] || [ "$RESPONSE" = "302" ]; then
    echo -e "${YELLOW}⚠ Redirected (HTTP $RESPONSE) - Auth middleware active${NC}"
    return 0
  else
    echo -e "${RED}✗ Failed (HTTP $RESPONSE)${NC}"
    return 1
  fi
}

# Try 3 times with exponential backoff
for i in 1 2 3; do
  if test_health $i; then
    HEALTH_OK=true
    break
  fi
  if [ $i -lt 3 ]; then
    WAIT=$((2 ** i))
    echo "Waiting ${WAIT}s before retry..."
    sleep $WAIT
  fi
done

if [ "$HEALTH_OK" != "true" ]; then
  echo -e "${RED}Health check failed after 3 attempts${NC}"
fi

echo ""
echo "3. RDS SECURITY GROUP VERIFICATION"
echo "===================================="

# Get RDS instance details
RDS_INFO=$(aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE --region $REGION 2>/dev/null)
if [ $? -eq 0 ]; then
  VPC_SG=$(echo $RDS_INFO | jq -r '.DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId')
  PUBLIC_ACCESS=$(echo $RDS_INFO | jq -r '.DBInstances[0].PubliclyAccessible')
  ENDPOINT=$(echo $RDS_INFO | jq -r '.DBInstances[0].Endpoint.Address')
  
  echo "RDS Instance: $RDS_INSTANCE"
  echo "Endpoint: $ENDPOINT"
  echo -e "Publicly Accessible: $([ "$PUBLIC_ACCESS" = "true" ] && echo -e "${YELLOW}Yes (temporary)${NC}" || echo -e "${GREEN}No${NC}")"
  echo "Security Group: $VPC_SG"
  
  # Get current client IP
  echo ""
  echo "Current Client IP:"
  CLIENT_IP=$(curl -s https://checkip.amazonaws.com 2>/dev/null | tr -d '\n')
  echo "  Your IP: $CLIENT_IP"
  
  # Get security group rules
  echo ""
  echo "Inbound Rules (Port 5432):"
  SG_RULES=$(aws ec2 describe-security-groups --group-ids $VPC_SG --region $REGION 2>/dev/null)
  if [ $? -eq 0 ]; then
    echo "$SG_RULES" | jq -r '.SecurityGroups[0].IpPermissions[] | 
      select(.FromPort == 5432) | 
      .IpRanges[] | 
      "  • \(.CidrIp) - \(.Description // "No description")"' 2>/dev/null
    
    # Check if only expected IPs
    RULE_COUNT=$(echo "$SG_RULES" | jq '[.SecurityGroups[0].IpPermissions[] | select(.FromPort == 5432) | .IpRanges[]] | length' 2>/dev/null)
    echo ""
    if [ "$RULE_COUNT" -eq 1 ]; then
      echo -e "${GREEN}✓ Only 1 inbound rule found (good for security)${NC}"
    else
      echo -e "${YELLOW}⚠ $RULE_COUNT inbound rules found - review for security${NC}"
    fi
  else
    echo -e "${RED}Failed to get security group rules${NC}"
  fi
else
  echo -e "${RED}Failed to get RDS instance info${NC}"
fi

echo ""
echo "4. S3 BUCKET SECURITY"
echo "====================="
echo "Bucket: $S3_BUCKET"

# Check public access block
PUBLIC_BLOCK=$(aws s3api get-public-access-block --bucket $S3_BUCKET --region $REGION 2>/dev/null)
if [ $? -eq 0 ]; then
  BLOCK_PUBLIC_ACLS=$(echo $PUBLIC_BLOCK | jq -r '.PublicAccessBlockConfiguration.BlockPublicAcls')
  IGNORE_PUBLIC_ACLS=$(echo $PUBLIC_BLOCK | jq -r '.PublicAccessBlockConfiguration.IgnorePublicAcls')
  BLOCK_PUBLIC_POLICY=$(echo $PUBLIC_BLOCK | jq -r '.PublicAccessBlockConfiguration.BlockPublicPolicy')
  RESTRICT_PUBLIC_BUCKETS=$(echo $PUBLIC_BLOCK | jq -r '.PublicAccessBlockConfiguration.RestrictPublicBuckets')
  
  echo "Public Access Block Settings:"
  echo -e "  Block Public ACLs: $([ "$BLOCK_PUBLIC_ACLS" = "true" ] && echo -e "${GREEN}✓ true${NC}" || echo -e "${RED}✗ false${NC}")"
  echo -e "  Ignore Public ACLs: $([ "$IGNORE_PUBLIC_ACLS" = "true" ] && echo -e "${GREEN}✓ true${NC}" || echo -e "${RED}✗ false${NC}")"
  echo -e "  Block Public Policy: $([ "$BLOCK_PUBLIC_POLICY" = "true" ] && echo -e "${GREEN}✓ true${NC}" || echo -e "${RED}✗ false${NC}")"
  echo -e "  Restrict Public Buckets: $([ "$RESTRICT_PUBLIC_BUCKETS" = "true" ] && echo -e "${GREEN}✓ true${NC}" || echo -e "${RED}✗ false${NC}")"
  
  if [ "$BLOCK_PUBLIC_ACLS" = "true" ] && [ "$IGNORE_PUBLIC_ACLS" = "true" ] && \
     [ "$BLOCK_PUBLIC_POLICY" = "true" ] && [ "$RESTRICT_PUBLIC_BUCKETS" = "true" ]; then
    echo -e "${GREEN}✓ All public access blocked (secure)${NC}"
  else
    echo -e "${YELLOW}⚠ Some public access settings are not blocked${NC}"
  fi
else
  # Try to set public access block if it doesn't exist
  echo -e "${YELLOW}Public access block not configured. Setting it now...${NC}"
  aws s3api put-public-access-block \
    --bucket $S3_BUCKET \
    --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" \
    --region $REGION 2>/dev/null
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Public access block configured successfully${NC}"
  else
    echo -e "${RED}✗ Failed to configure public access block${NC}"
  fi
fi

# Check bucket encryption
echo ""
echo "Bucket Encryption:"
ENCRYPTION=$(aws s3api get-bucket-encryption --bucket $S3_BUCKET --region $REGION 2>/dev/null)
if [ $? -eq 0 ]; then
  SSE_ALGO=$(echo $ENCRYPTION | jq -r '.ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm')
  echo -e "  Encryption: ${GREEN}✓ $SSE_ALGO${NC}"
else
  echo -e "  Encryption: ${YELLOW}⚠ Not configured${NC}"
fi

echo ""
echo "============================================"
echo "=== VERIFICATION SUMMARY ==="
echo "============================================"

# Summary
echo ""
if [ "$HEALTH_OK" = "true" ]; then
  echo -e "${GREEN}✓ Application is responding${NC}"
else
  echo -e "${RED}✗ Application health check failed${NC}"
fi

if [ "$PUBLIC_ACCESS" = "true" ]; then
  echo -e "${YELLOW}⚠ RDS is publicly accessible (temporary setup)${NC}"
else
  echo -e "${GREEN}✓ RDS is private${NC}"
fi

if [ "$BLOCK_PUBLIC_ACLS" = "true" ]; then
  echo -e "${GREEN}✓ S3 bucket is properly secured${NC}"
else
  echo -e "${YELLOW}⚠ S3 bucket needs security review${NC}"
fi

echo ""
echo "Verification complete at $(date '+%Y-%m-%d %H:%M:%S')"