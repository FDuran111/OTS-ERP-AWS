#!/bin/sh
set -e

echo "=== Final Database Verification ==="

PGPASSWORD=LPiSvMCtjszj35aZfRJL psql \
  -h ots-erp-prod-rds.c5cymmac2hya.us-east-2.rds.amazonaws.com \
  -U otsapp \
  -d ortmeier <<SQL
-- Count all tables
SELECT COUNT(*) as total_tables FROM pg_tables WHERE schemaname = 'public';

-- List main tables with row counts
SELECT 
  t.tablename,
  (xpath('/row/cnt/text()', xml_count))[1]::text::int as row_count
FROM (
  SELECT 
    tablename, 
    query_to_xml(format('select count(*) as cnt from %I', tablename), false, true, '') as xml_count
  FROM pg_tables
  WHERE schemaname = 'public' 
    AND tablename IN ('User', 'Customer', 'Job', 'Material', 'Invoice', 'Lead', 'Equipment', 'TimeEntry', 'BidSheet', 'JobReminder', 'LaborRate', 'MaterialUsage', 'StockMovement', 'Warehouse')
) t
ORDER BY tablename;

-- Check for successful migration tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('JobDivision', 'BidSheet', 'JobReminder', 'MaterialUsage', 'StockMovement', 'Warehouse')
ORDER BY tablename;

-- Database status
SELECT 'Database verification complete' as status, current_timestamp;
SQL

echo "=== Verification Complete ==="