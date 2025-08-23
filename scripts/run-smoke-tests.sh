#!/bin/bash

# Script to run smoke tests locally against staging
# Usage: ./scripts/run-smoke-tests.sh [staging-url]

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "🔥 Staging Smoke Test Runner"
echo "=========================================="
echo ""

# Get staging URL (from argument or default)
STAGING_URL=${1:-""}

if [ -z "$STAGING_URL" ]; then
  echo "ℹ️  No URL provided, attempting to get from AWS..."
  
  # Try to get from AWS
  if command -v aws &> /dev/null; then
    AMPLIFY_APP_ID=$(aws amplify list-apps \
      --query "apps[?name=='ots-arp-aws-staging-app'].appId" \
      --output text 2>/dev/null || echo "")
    
    if [ -n "$AMPLIFY_APP_ID" ]; then
      AMPLIFY_DOMAIN=$(aws amplify get-app \
        --app-id "$AMPLIFY_APP_ID" \
        --query "app.defaultDomain" \
        --output text 2>/dev/null || echo "")
      
      BRANCH_NAME=$(aws amplify list-branches \
        --app-id "$AMPLIFY_APP_ID" \
        --query "branches[0].branchName" \
        --output text 2>/dev/null || echo "main")
      
      if [ -n "$AMPLIFY_DOMAIN" ]; then
        STAGING_URL="https://${BRANCH_NAME}.${AMPLIFY_DOMAIN}"
        echo -e "${GREEN}✅ Found staging URL from AWS${NC}"
      fi
    fi
  fi
  
  # If still no URL, ask user
  if [ -z "$STAGING_URL" ]; then
    echo "Enter staging URL (e.g., https://main.d123456.amplifyapp.com):"
    read -r STAGING_URL
  fi
fi

# Get basic auth credentials
if [ -z "$STAGING_BASIC_AUTH" ]; then
  echo ""
  echo "Checking for basic auth credentials..."
  
  # Try to get from AWS Secrets Manager
  if command -v aws &> /dev/null; then
    BASIC_AUTH_SECRET=$(aws secretsmanager get-secret-value \
      --secret-id ots-arp-aws-staging-basic-auth \
      --query SecretString \
      --output text 2>/dev/null || echo "{}")
    
    if [ "$BASIC_AUTH_SECRET" != "{}" ]; then
      USERNAME=$(echo "$BASIC_AUTH_SECRET" | jq -r '.username' 2>/dev/null || echo "")
      PASSWORD=$(echo "$BASIC_AUTH_SECRET" | jq -r '.password' 2>/dev/null || echo "")
      
      if [ -n "$USERNAME" ] && [ -n "$PASSWORD" ]; then
        STAGING_BASIC_AUTH="${USERNAME}:${PASSWORD}"
        echo -e "${GREEN}✅ Retrieved credentials from Secrets Manager${NC}"
      fi
    fi
  fi
  
  # If no credentials from AWS, ask user
  if [ -z "$STAGING_BASIC_AUTH" ]; then
    echo ""
    echo "Basic auth required? (y/n):"
    read -r USE_AUTH
    
    if [ "$USE_AUTH" = "y" ]; then
      echo "Username:"
      read -r USERNAME
      echo "Password:"
      read -rs PASSWORD
      echo ""
      STAGING_BASIC_AUTH="${USERNAME}:${PASSWORD}"
    fi
  fi
fi

# Export environment variables
export STAGING_BASE_URL="$STAGING_URL"
export STAGING_BASIC_AUTH="$STAGING_BASIC_AUTH"

# Check Node.js is installed
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is not installed${NC}"
  echo "Please install Node.js 20 or later"
  exit 1
fi

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${YELLOW}⚠️  Node.js version is less than 18${NC}"
  echo "Recommended: Node.js 20 or later"
fi

# Run smoke tests
echo ""
echo "=========================================="
echo "Configuration:"
echo "  URL: $STAGING_BASE_URL"
echo "  Auth: $([ -n "$STAGING_BASIC_AUTH" ] && echo "Configured" || echo "Not configured")"
echo "=========================================="
echo ""

# Run the tests
node scripts/smoke-staging.mjs

# Capture exit code
EXIT_CODE=$?

# Summary
echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All smoke tests passed!${NC}"
  echo "Staging environment is healthy."
else
  echo -e "${RED}❌ Some smoke tests failed${NC}"
  echo "Please check the staging deployment."
fi

exit $EXIT_CODE