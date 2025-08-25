#!/bin/bash

# Legacy Reference Scanner
# Finds any remaining Supabase, Coolify, or NextAuth references

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 Scanning for Legacy References"
echo "=================================="
echo ""

FOUND_ISSUES=0

# Function to search and report
search_pattern() {
    local pattern=$1
    local description=$2
    local exclude_dirs="node_modules|.git|.next|dist|build|env-reports"
    
    echo -e "${BLUE}Checking for ${description}...${NC}"
    
    # Use ripgrep if available, otherwise use grep
    if command -v rg &> /dev/null; then
        results=$(rg -n "$pattern" \
            --glob '!node_modules' \
            --glob '!.git' \
            --glob '!.next' \
            --glob '!dist' \
            --glob '!build' \
            --glob '!env-reports' \
            --glob '!*.md' \
            src/ pages/ app/ components/ lib/ .env* infra/ 2>/dev/null || true)
    else
        results=$(grep -r -n "$pattern" \
            --exclude-dir=node_modules \
            --exclude-dir=.git \
            --exclude-dir=.next \
            --exclude-dir=dist \
            --exclude-dir=build \
            --exclude-dir=env-reports \
            --exclude='*.md' \
            src/ pages/ app/ components/ lib/ .env* infra/ 2>/dev/null || true)
    fi
    
    if [ -n "$results" ]; then
        echo -e "${RED}❌ Found ${description}:${NC}"
        echo "$results" | head -20
        if [ $(echo "$results" | wc -l) -gt 20 ]; then
            echo -e "${YELLOW}... and $(( $(echo "$results" | wc -l) - 20 )) more${NC}"
        fi
        echo ""
        FOUND_ISSUES=$((FOUND_ISSUES + 1))
    else
        echo -e "${GREEN}✅ No ${description} found${NC}"
    fi
    echo ""
}

# Check for Supabase references
search_pattern "supabase|SUPABASE" "Supabase references"

# Check for Supabase URLs
search_pattern "supabase\.co|supabase\.com|storage\.supabase" "Supabase URLs"

# Check for Coolify references
search_pattern "coolify|COOLIFY" "Coolify references"

# Check for NextAuth (we don't use it)
search_pattern "NEXTAUTH_|NextAuth|next-auth" "NextAuth references (not used)"

# Check for Supabase in DATABASE_URL
echo -e "${BLUE}Checking DATABASE_URL for Supabase...${NC}"
if grep -r "DATABASE_URL.*supabase" .env* 2>/dev/null | grep -v ".example"; then
    echo -e "${RED}❌ Found Supabase in DATABASE_URL${NC}"
    FOUND_ISSUES=$((FOUND_ISSUES + 1))
else
    echo -e "${GREEN}✅ No Supabase in DATABASE_URL${NC}"
fi
echo ""

# Check for production references in staging isolation
echo -e "${BLUE}Checking for production/staging mixups...${NC}"
if grep -n "(prod|production).*staging" src/lib/assertEnvIsolation.ts 2>/dev/null | grep -v "production indicators"; then
    echo -e "${YELLOW}⚠️  Found potential prod/staging mixup in isolation guards${NC}"
    FOUND_ISSUES=$((FOUND_ISSUES + 1))
else
    echo -e "${GREEN}✅ No production/staging mixups${NC}"
fi
echo ""

# Check package.json for legacy dependencies
echo -e "${BLUE}Checking package.json for legacy dependencies...${NC}"
if grep -E "@supabase|coolify|next-auth" package.json 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Found legacy dependencies in package.json${NC}"
    grep -E "@supabase|coolify|next-auth" package.json
    FOUND_ISSUES=$((FOUND_ISSUES + 1))
else
    echo -e "${GREEN}✅ No legacy dependencies in package.json${NC}"
fi
echo ""

# Summary
echo "=================================="
echo "📊 Scan Summary"
echo "=================================="
echo ""

if [ $FOUND_ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 SUCCESS: No legacy references found!${NC}"
    echo ""
    echo "The codebase is clean and ready for AWS-only operation."
    exit 0
else
    echo -e "${RED}❌ ISSUES FOUND: ${FOUND_ISSUES} type(s) of legacy references detected${NC}"
    echo ""
    echo "Please clean up the references above to ensure proper AWS-only operation."
    echo ""
    echo "Common fixes:"
    echo "  • Remove SUPABASE_* variables from .env files"
    echo "  • Update DATABASE_URL to use RDS endpoint"
    echo "  • Remove NextAuth imports and configuration"
    echo "  • Delete Coolify deployment files"
    echo ""
    echo "After fixing, run this script again to verify."
    exit 1
fi