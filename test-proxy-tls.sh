#!/bin/sh
set -e

echo "Testing RDS Proxy connection with TLS..."

# Download RDS CA certificate
curl -s https://truststore.pki.rds.amazonaws.com/us-east-2/us-east-2-bundle.pem -o /tmp/rds-ca.pem

PROXYHOST="ots-erp-prod-rds-proxy.proxy-c5cymmac2hya.us-east-2.rds.amazonaws.com"
DB="ortmeier"
USER="otsapp"
PASS="LPiSvMCtjszj35aZfRJL"

echo "Testing connection to proxy at $PROXYHOST..."

# Test with sslmode=require (TLS required by proxy)
PGPASSWORD="$PASS" psql \
  "host=$PROXYHOST port=5432 dbname=$DB user=$USER sslmode=require sslrootcert=/tmp/rds-ca.pem" \
  -c "SELECT 'Proxy connection successful!' as status, current_timestamp;"

echo "Connection test complete!"