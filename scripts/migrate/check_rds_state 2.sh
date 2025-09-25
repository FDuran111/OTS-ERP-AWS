#!/bin/bash
# Check current RDS state

echo "Checking RDS database state..."

# Get RDS connection from Secrets Manager
DST_DB_URL=$(aws secretsmanager get-secret-value \
  --region us-east-2 \
  --secret-id "ots-erp/prod/database-url" \
  --query 'SecretString' \
  --output text)

# Create SQL to check database state
cat > /tmp/check_rds.sql <<'EOF'
-- Check for tables
SELECT 'Tables in public schema:' as info;
SELECT COUNT(*) as table_count 
FROM pg_tables 
WHERE schemaname = 'public';

SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename
LIMIT 20;

-- Check for data in key tables
SELECT 'Checking for data:' as info;
SELECT 
  (SELECT COUNT(*) FROM customers) as customers_count,
  (SELECT COUNT(*) FROM jobs) as jobs_count,
  (SELECT COUNT(*) FROM materials) as materials_count;

-- Check for schemas
SELECT 'Available schemas:' as info;
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
ORDER BY schema_name;
EOF

# Run the check
psql "$DST_DB_URL" -f /tmp/check_rds.sql