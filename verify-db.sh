#!/bin/sh
set -e

echo "Verifying database tables..."

PGPASSWORD=LPiSvMCtjszj35aZfRJL psql \
  -h ots-erp-prod-rds.c5cymmac2hya.us-east-2.rds.amazonaws.com \
  -U otsapp \
  -d ortmeier <<SQL
-- List all tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Count rows in main tables
SELECT 'User' as table_name, COUNT(*) as row_count FROM "User"
UNION ALL
SELECT 'Customer', COUNT(*) FROM "Customer"
UNION ALL
SELECT 'Job', COUNT(*) FROM "Job"
UNION ALL
SELECT 'Material', COUNT(*) FROM "Material"
UNION ALL
SELECT 'Invoice', COUNT(*) FROM "Invoice"
UNION ALL
SELECT 'Lead', COUNT(*) FROM "Lead"
ORDER BY table_name;

-- Check if we can run queries
SELECT 'Test query successful!' as status;
SQL

echo "Verification complete!"