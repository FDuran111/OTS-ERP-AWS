#!/bin/sh
set -e

echo "Setting up database user..."

# Download RDS CA certificate
curl -s https://truststore.pki.rds.amazonaws.com/us-east-2/us-east-2-bundle.pem -o /tmp/rds-ca.pem

# Connect directly to RDS instance (not proxy) as master user
DBHOST="ots-erp-prod-rds.c5cymmac2hya.us-east-2.rds.amazonaws.com"
DBNAME="ortmeier"
MASTER_USER="otsapp"
MASTER_PASS="LPiSvMCtjszj35aZfRJL"

echo "Connecting to RDS instance at $DBHOST..."

# Since otsapp is the master user, we just need to verify it works and grant permissions
PGPASSWORD="$MASTER_PASS" psql \
  "host=$DBHOST port=5432 dbname=$DBNAME user=$MASTER_USER sslmode=require sslrootcert=/tmp/rds-ca.pem" <<SQL
-- Verify connection
SELECT current_user, current_database();

-- Create schema if not exists
CREATE SCHEMA IF NOT EXISTS public;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO $MASTER_USER;
GRANT ALL PRIVILEGES ON DATABASE ortmeier TO $MASTER_USER;

-- Check if we can create a test table
CREATE TABLE IF NOT EXISTS connection_test (
    id serial PRIMARY KEY,
    test_time timestamp DEFAULT NOW()
);

-- Insert test record
INSERT INTO connection_test (test_time) VALUES (NOW());

-- Verify
SELECT COUNT(*) as test_records FROM connection_test;

-- Clean up test
DROP TABLE IF EXISTS connection_test;

SELECT 'Database user setup complete!' as status;
SQL

echo "Database user verification complete!"