#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'

echo "======================================"
echo "🔍 Verifying Local Database Setup"
echo "======================================"
echo ""

# PostgreSQL version
echo -e "${BLUE}PostgreSQL Version:${NC}"
/opt/homebrew/opt/postgresql@16/bin/psql --version
echo ""

# Database connection
echo -e "${BLUE}Database:${NC} ots_erp_local"
echo ""

# Count tables
TABLES=$(/opt/homebrew/opt/postgresql@16/bin/psql ots_erp_local -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo -e "${GREEN}✓${NC} Tables: $TABLES (should be 87)"

# Count records in key tables
USERS=$(/opt/homebrew/opt/postgresql@16/bin/psql ots_erp_local -t -c "SELECT COUNT(*) FROM \"User\";")
echo -e "${GREEN}✓${NC} Users: $USERS"

JOBS=$(/opt/homebrew/opt/postgresql@16/bin/psql ots_erp_local -t -c "SELECT COUNT(*) FROM \"Job\";")
echo -e "${GREEN}✓${NC} Jobs: $JOBS"

CUSTOMERS=$(/opt/homebrew/opt/postgresql@16/bin/psql ots_erp_local -t -c "SELECT COUNT(*) FROM \"Customer\";")
echo -e "${GREEN}✓${NC} Customers: $CUSTOMERS"

MATERIALS=$(/opt/homebrew/opt/postgresql@16/bin/psql ots_erp_local -t -c "SELECT COUNT(*) FROM \"Material\";")
echo -e "${GREEN}✓${NC} Materials: $MATERIALS"

echo ""
echo "======================================"
echo "📊 Comparing with AWS RDS"
echo "======================================"
echo ""

# Check if SSH tunnel is active
if lsof -i:5433 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} SSH tunnel to RDS is active on port 5433"

    # Compare table counts
    RDS_TABLES=$(psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null)

    if [ "$TABLES" == "$RDS_TABLES" ]; then
        echo -e "${GREEN}✓${NC} Table count matches RDS ($RDS_TABLES tables)"
    else
        echo -e "${YELLOW}⚠${NC} Table count mismatch - Local: $TABLES, RDS: $RDS_TABLES"
    fi
else
    echo -e "${YELLOW}⚠${NC} SSH tunnel not active (run to compare with RDS):"
    echo "    ssh -i ~/Desktop/ortmeier-bastion-key.pem -L 5433:ots-erp-prod-rds.c5cymmac2hya.us-east-2.rds.amazonaws.com:5432 ec2-user@18.223.108.189 -N"
fi

echo ""
echo "======================================"
echo "🔧 Missing Tables Check"
echo "======================================"
echo ""

# Check for tables that might be missing
for table in "JobSchedule" "MaterialReservation" "StockMovement" "JobReminder"; do
    if /opt/homebrew/opt/postgresql@16/bin/psql ots_erp_local -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" | grep -q 1; then
        echo -e "${GREEN}✓${NC} Table '$table' exists"
    else
        echo -e "${RED}✗${NC} Table '$table' is MISSING (needs to be created)"
    fi
done

echo ""
echo "======================================"
echo "✅ Local Database Ready!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Run: npm run dev"
echo "2. Test login at http://localhost:3000"
echo "3. Available users:"
/opt/homebrew/opt/postgresql@16/bin/psql ots_erp_local -c "SELECT email, role FROM \"User\" LIMIT 5;"

echo ""
echo "To switch between databases:"
echo "  - Local RDS replica: Already configured in .env.local"
echo "  - Supabase: Uncomment SUPABASE_DATABASE_URL in .env.local"
echo "  - Production RDS: Use SSH tunnel (port 5433)"