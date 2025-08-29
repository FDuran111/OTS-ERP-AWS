#!/bin/sh
set -e

echo "=== Final Migration Runner ==="
echo "Using direct RDS connection with TLS"

# Download RDS CA certificate
curl -s https://truststore.pki.rds.amazonaws.com/us-east-2/us-east-2-bundle.pem -o /tmp/rds-ca.pem

# Set connection parameters
export DB_DRIVER=RDS
export RDS_PROXY_ENDPOINT=ots-erp-prod-rds.c5cymmac2hya.us-east-2.rds.amazonaws.com
export RDS_DB=ortmeier
export RDS_USER=otsapp
export RDS_PASSWORD=LPiSvMCtjszj35aZfRJL
export NODE_ENV=production

echo "Testing connection..."
PGPASSWORD="$RDS_PASSWORD" psql \
  "host=$RDS_PROXY_ENDPOINT port=5432 dbname=$RDS_DB user=$RDS_USER sslmode=require sslrootcert=/tmp/rds-ca.pem" \
  -c "SELECT 'Connection successful' as status;"

echo "Running migrations..."
npm run db:migrate

echo "Verifying database..."
npm run db:migrate:verify

echo "=== Migration complete ==="