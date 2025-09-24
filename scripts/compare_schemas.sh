#!/bin/bash

echo "================================"
echo "LOCAL DATABASE SCHEMA"
echo "================================"
echo ""
echo "Tables in local database:"
/opt/homebrew/opt/postgresql@16/bin/psql "postgresql://localhost/ots_erp_local" -c "\dt" 2>/dev/null

echo ""
echo "FileUpload table in local (if exists):"
/opt/homebrew/opt/postgresql@16/bin/psql "postgresql://localhost/ots_erp_local" -c "\d \"FileUpload\"" 2>/dev/null

echo ""
echo "================================"
echo "RDS PRODUCTION DATABASE SCHEMA"
echo "================================"
echo ""
echo "Waiting for SSH tunnel to be ready..."
sleep 5

echo "Tables in RDS:"
/opt/homebrew/opt/postgresql@16/bin/psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" -c "\dt" 2>/dev/null || echo "Failed to connect to RDS. Make sure SSH tunnel is running."

echo ""
echo "FileUpload table in RDS (if exists):"
/opt/homebrew/opt/postgresql@16/bin/psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" -c "\d \"FileUpload\"" 2>/dev/null || echo "Table doesn't exist in RDS yet"

echo ""
echo "================================"
echo "COMPARISON SUMMARY"
echo "================================"
echo ""
echo "Checking for missing tables in RDS..."
/opt/homebrew/opt/postgresql@16/bin/psql "postgresql://localhost/ots_erp_local" -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public'" 2>/dev/null | while read table; do
  if [ ! -z "$table" ]; then
    /opt/homebrew/opt/postgresql@16/bin/psql "postgresql://otsapp:LPiSvMCtjszj35aZfRJL@localhost:5433/ortmeier" -t -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='$table')" 2>/dev/null | grep -q 't' || echo "Missing in RDS: $table"
  fi
done