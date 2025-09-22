#!/bin/bash

# Schema Compatibility Checker
# Compares expected schema with actual RDS schema

echo "🔍 Schema Compatibility Check"
echo "=============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment
if [ "$1" == "production" ]; then
    echo "Checking PRODUCTION RDS..."
    DB_HOST="ots-erp-prod-rds-proxy.proxy-c5cymmac2hya.us-east-2.rds.amazonaws.com"
    DB_USER="ortmeier_admin"
    DB_NAME="ortmeier"
    echo "⚠️  You'll need to run this from bastion host"
else
    echo "Checking LOCAL/Supabase..."
    CONNECTION_STRING=$DATABASE_URL
fi

# Tables that MUST exist
REQUIRED_TABLES=(
    "User"
    "Job"
    "Customer"
    "Invoice"
    "Material"
    "TimeEntry"
    "PurchaseOrder"
)

# Critical columns
declare -A CRITICAL_COLUMNS
CRITICAL_COLUMNS["User"]="id,email,password,role"
CRITICAL_COLUMNS["Job"]="id,customerId,status,createdAt"
CRITICAL_COLUMNS["Customer"]="id,firstName,lastName,email"

echo ""
echo "Checking Required Tables..."
echo "---------------------------"

for table in "${REQUIRED_TABLES[@]}"; do
    if [ "$1" == "production" ]; then
        EXISTS=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null)
    else
        EXISTS=$(psql "$CONNECTION_STRING" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null)
    fi

    if [[ $EXISTS == *"t"* ]]; then
        echo -e "${GREEN}✓${NC} Table '$table' exists"

        # Check critical columns if defined
        if [ "${CRITICAL_COLUMNS[$table]}" ]; then
            IFS=',' read -ra COLS <<< "${CRITICAL_COLUMNS[$table]}"
            for col in "${COLS[@]}"; do
                if [ "$1" == "production" ]; then
                    COL_EXISTS=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '$table' AND column_name = '$col');" 2>/dev/null)
                else
                    COL_EXISTS=$(psql "$CONNECTION_STRING" -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '$table' AND column_name = '$col');" 2>/dev/null)
                fi

                if [[ $COL_EXISTS == *"t"* ]]; then
                    echo -e "  ${GREEN}✓${NC} Column '$col' exists"
                else
                    echo -e "  ${RED}✗${NC} Column '$col' MISSING!"
                fi
            done
        fi
    else
        echo -e "${RED}✗${NC} Table '$table' MISSING!"
    fi
done

echo ""
echo "Checking for Schema Mismatches..."
echo "---------------------------------"

# Check for common mismatches
echo "Checking User vs users table..."
if [ "$1" == "production" ]; then
    USER_TABLE=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('User', 'users');" 2>/dev/null)
else
    USER_TABLE=$(psql "$CONNECTION_STRING" -t -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('User', 'users');" 2>/dev/null)
fi

if [[ $USER_TABLE == *"users"* ]] && [[ $USER_TABLE != *"User"* ]]; then
    echo -e "${YELLOW}⚠${NC}  Found 'users' table but not 'User' - Schema mismatch!"
fi

# Check for password vs password_hash
echo "Checking password field..."
if [ "$1" == "production" ]; then
    PWD_FIELD=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "SELECT column_name FROM information_schema.columns WHERE table_name IN ('User', 'users') AND column_name IN ('password', 'password_hash');" 2>/dev/null)
else
    PWD_FIELD=$(psql "$CONNECTION_STRING" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name IN ('User', 'users') AND column_name IN ('password', 'password_hash');" 2>/dev/null)
fi

if [[ $PWD_FIELD == *"password_hash"* ]]; then
    echo -e "${YELLOW}⚠${NC}  Found 'password_hash' instead of 'password' - Code expects 'password'!"
fi

echo ""
echo "=============================="
echo "Summary:"
if [ "$1" == "production" ]; then
    echo "To run full check on production:"
    echo "1. SSH to bastion: ssh -i ~/Desktop/ortmeier-bastion-key.pem ec2-user@18.223.108.189"
    echo "2. Run: ./check-schema-compatibility.sh production"
else
    echo "Local/Supabase check complete."
    echo "Run with 'production' argument to check RDS."
fi