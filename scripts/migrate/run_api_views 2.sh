#!/usr/bin/env bash
set -euo pipefail

# Get database URL from secret
DST_DB_URL="$(aws secretsmanager get-secret-value --region us-east-2 --secret-id ots-erp/prod/database-url --query 'SecretString' --output text)"

echo "Creating API compatibility views..."
psql "$DST_DB_URL" -v ON_ERROR_STOP=1 -f ./create_api_views.sql

echo "Views created successfully!"