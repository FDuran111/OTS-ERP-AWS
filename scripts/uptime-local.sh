#!/bin/bash

# Local uptime check script for staging
# Can be run manually to verify staging health

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
STAGING_URL="${STAGING_URL:-}"
STAGING_USERNAME="${STAGING_USERNAME:-}"
STAGING_PASSWORD="${STAGING_PASSWORD:-}"
USE_AWS="${USE_AWS:-false}"

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "success")
            echo -e "${GREEN}✅ ${message}${NC}"
            ;;
        "error")
            echo -e "${RED}❌ ${message}${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  ${message}${NC}"
            ;;
        *)
            echo "$message"
            ;;
    esac
}

# Function to get staging info from AWS
get_aws_staging_info() {
    echo "🔍 Fetching staging information from AWS..."
    
    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        print_status "error" "AWS CLI not found. Please install it or set STAGING_URL manually."
        exit 1
    fi
    
    # Get Amplify app info
    AMPLIFY_APP_ID=$(aws amplify list-apps \
        --query "apps[?name=='ots-arp-aws-staging-app'].appId" \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$AMPLIFY_APP_ID" ]; then
        print_status "error" "Amplify app not found"
        exit 1
    fi
    
    # Get domain
    AMPLIFY_DOMAIN=$(aws amplify get-app \
        --app-id "$AMPLIFY_APP_ID" \
        --query "app.defaultDomain" \
        --output text 2>/dev/null || echo "")
    
    # Get branch
    BRANCH_NAME=$(aws amplify list-branches \
        --app-id "$AMPLIFY_APP_ID" \
        --query "branches[0].branchName" \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$AMPLIFY_DOMAIN" ] && [ -n "$BRANCH_NAME" ]; then
        STAGING_URL="https://${BRANCH_NAME}.${AMPLIFY_DOMAIN}"
        print_status "success" "Found staging URL: $STAGING_URL"
    else
        print_status "error" "Could not determine staging URL from AWS"
        exit 1
    fi
    
    # Try to get basic auth credentials
    BASIC_AUTH_SECRET=$(aws secretsmanager get-secret-value \
        --secret-id ots-arp-aws-staging-basic-auth \
        --query SecretString \
        --output text 2>/dev/null || echo "{}")
    
    if [ "$BASIC_AUTH_SECRET" != "{}" ]; then
        STAGING_USERNAME=$(echo "$BASIC_AUTH_SECRET" | jq -r '.username // ""')
        STAGING_PASSWORD=$(echo "$BASIC_AUTH_SECRET" | jq -r '.password // ""')
        
        if [ -n "$STAGING_USERNAME" ] && [ -n "$STAGING_PASSWORD" ]; then
            print_status "success" "Retrieved basic auth credentials from Secrets Manager"
        fi
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            STAGING_URL="$2"
            shift 2
            ;;
        --username)
            STAGING_USERNAME="$2"
            shift 2
            ;;
        --password)
            STAGING_PASSWORD="$2"
            shift 2
            ;;
        --aws)
            USE_AWS="true"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --url URL          Staging URL (default: fetch from AWS)"
            echo "  --username USER    Basic auth username"
            echo "  --password PASS    Basic auth password"
            echo "  --aws              Fetch URL and credentials from AWS"
            echo "  --help             Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  STAGING_URL        Staging URL"
            echo "  STAGING_USERNAME   Basic auth username"
            echo "  STAGING_PASSWORD   Basic auth password"
            echo "  USE_AWS           Set to 'true' to fetch from AWS"
            exit 0
            ;;
        *)
            print_status "error" "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Header
echo "========================================="
echo "   🏥 Staging Uptime Check"
echo "========================================="
echo ""

# Get staging info from AWS if requested or if URL not provided
if [ "$USE_AWS" = "true" ] || [ -z "$STAGING_URL" ]; then
    get_aws_staging_info
fi

# Validate URL
if [ -z "$STAGING_URL" ]; then
    print_status "error" "No staging URL provided. Use --url or --aws flag."
    echo ""
    echo "Examples:"
    echo "  $0 --url https://staging.example.com"
    echo "  $0 --aws"
    echo "  STAGING_URL=https://staging.example.com $0"
    exit 1
fi

# Build health check URL
HEALTH_URL="${STAGING_URL}/api/health"
echo "📍 Target: $HEALTH_URL"

# Build auth header if credentials provided
AUTH_HEADER=""
if [ -n "$STAGING_USERNAME" ] && [ -n "$STAGING_PASSWORD" ]; then
    AUTH_HEADER="Authorization: Basic $(echo -n "${STAGING_USERNAME}:${STAGING_PASSWORD}" | base64)"
    echo "🔐 Using basic authentication"
else
    echo "🔓 No authentication configured"
fi

echo ""
echo "🚀 Performing health check..."
echo "----------------------------------------"

# Perform health check
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
echo "⏰ Timestamp: $TIMESTAMP"

if [ -n "$AUTH_HEADER" ]; then
    RESPONSE=$(curl -sS -w "\n%{http_code}" \
        -H "$AUTH_HEADER" \
        -H "Accept: application/json" \
        "$HEALTH_URL" 2>&1 || echo "CURL_ERROR")
else
    RESPONSE=$(curl -sS -w "\n%{http_code}" \
        -H "Accept: application/json" \
        "$HEALTH_URL" 2>&1 || echo "CURL_ERROR")
fi

# Parse response
if [ "$RESPONSE" = "CURL_ERROR" ]; then
    STATUS_CODE=0
    BODY="Connection failed"
else
    STATUS_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
fi

echo "📊 HTTP Status: $STATUS_CODE"
echo ""

# Pretty print JSON if possible
if command -v jq &> /dev/null && [ "$STATUS_CODE" != "0" ]; then
    echo "📝 Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo "📝 Response: $BODY"
fi

echo ""
echo "========================================="
echo "   📈 Results"
echo "========================================="
echo ""

# Check health status
if [ "$STATUS_CODE" = "200" ] || [ "$STATUS_CODE" = "201" ]; then
    # Parse JSON to check ok field
    if command -v jq &> /dev/null; then
        OK_STATUS=$(echo "$BODY" | jq -r '.ok // false' 2>/dev/null || echo "false")
        ENV=$(echo "$BODY" | jq -r '.environment // "unknown"' 2>/dev/null || echo "unknown")
        DB_STATUS=$(echo "$BODY" | jq -r '.checks.database // false' 2>/dev/null || echo "false")
        STORAGE=$(echo "$BODY" | jq -r '.storageProvider // "unknown"' 2>/dev/null || echo "unknown")
    else
        # Fallback: check if response contains ok:true
        if echo "$BODY" | grep -q '"ok":true'; then
            OK_STATUS="true"
        else
            OK_STATUS="false"
        fi
        ENV="unknown"
        DB_STATUS="unknown"
        STORAGE="unknown"
    fi
    
    if [ "$OK_STATUS" = "true" ]; then
        print_status "success" "Health check PASSED"
        echo ""
        echo "📋 Details:"
        echo "  • Environment: $ENV"
        echo "  • Database: $DB_STATUS"
        echo "  • Storage: $STORAGE"
        echo ""
        print_status "success" "Staging is healthy! 🎉"
        exit 0
    else
        print_status "error" "Health check FAILED - API returned ok: false"
        echo ""
        echo "📋 Details:"
        echo "  • Environment: $ENV"
        echo "  • Database: $DB_STATUS"
        echo "  • Storage: $STORAGE"
        echo ""
        print_status "warning" "Please check the staging deployment"
        exit 1
    fi
else
    print_status "error" "Health check FAILED - HTTP $STATUS_CODE"
    echo ""
    
    if [ "$STATUS_CODE" = "401" ]; then
        print_status "warning" "Authentication required. Please provide credentials:"
        echo "  $0 --username <user> --password <pass>"
    elif [ "$STATUS_CODE" = "0" ]; then
        print_status "warning" "Could not connect to staging. Check if:"
        echo "  • The URL is correct"
        echo "  • The staging environment is running"
        echo "  • Network connectivity is available"
    else
        print_status "warning" "Unexpected response. Please check:"
        echo "  • Application logs in CloudWatch"
        echo "  • Amplify deployment status"
        echo "  • Recent commits for breaking changes"
    fi
    
    exit 1
fi