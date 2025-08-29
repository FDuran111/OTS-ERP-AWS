#!/bin/bash
set -e

echo "=== OTS-ERP Data Migration (Simplified) ==="
echo "==========================================="
echo

# Check environment variables
echo "Checking environment variables..."
if [ -z "$RDS_ENDPOINT" ] || [ -z "$RDS_DB" ] || [ -z "$RDS_USER" ] || [ -z "$RDS_PASSWORD" ]; then
  echo "ERROR: Missing required RDS environment variables"
  exit 1
fi

# Setup PostgreSQL connection
export PGHOST="$RDS_ENDPOINT"
export PGDATABASE="$RDS_DB"
export PGUSER="$RDS_USER"
export PGPASSWORD="$RDS_PASSWORD"
export PGSSLMODE=require

echo "Testing RDS connection..."
if psql -c "SELECT 'RDS connection successful' as status;" 2>/dev/null; then
  echo "✅ RDS connection verified"
else
  echo "❌ Failed to connect to RDS"
  echo "Connection details:"
  echo "  Host: $PGHOST"
  echo "  Database: $PGDATABASE"
  echo "  User: $PGUSER"
  exit 1
fi

# Run validation of current state
echo -e "\nValidating RDS Database State"
echo "-----------------------------"

# Check for tables
echo "Checking tables..."
TABLES=$(psql -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';")
echo "Found $TABLES tables in public schema"

# Count records in key tables
echo -e "\nCounting records in key tables:"
for table in User Customer Job Material Invoice Equipment; do
  if psql -c "SELECT 1 FROM \"$table\" LIMIT 1" >/dev/null 2>&1; then
    COUNT=$(psql -t -c "SELECT COUNT(*) FROM \"$table\"" 2>/dev/null || echo "0")
    echo "  $table: $COUNT rows"
  else
    echo "  $table: table not found"
  fi
done

# Check for any migration scripts
if [ -d "scripts" ] && ls scripts/*.sql >/dev/null 2>&1; then
  echo -e "\nFound SQL migration scripts:"
  ls -la scripts/*.sql | head -10
fi

# Skip TypeScript migrations - just validate
echo -e "\nSkipping TypeScript migrations (already run in previous tasks)"

# Final validation
echo -e "\n=== Migration Status Summary ==="
echo "================================"

# Get final counts
psql -c "
SELECT 
  (SELECT COUNT(*) FROM \"User\") as users,
  (SELECT COUNT(*) FROM \"Customer\") as customers,
  (SELECT COUNT(*) FROM \"Job\") as jobs,
  (SELECT COUNT(*) FROM \"Material\") as materials,
  (SELECT COUNT(*) FROM \"Invoice\") as invoices
" 2>/dev/null || echo "Could not get final counts"

echo -e "\n✅ Data migration check complete"
echo "=================================="