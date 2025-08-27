#!/usr/bin/env bash
set -euo pipefail

DB_ENDPOINT="${1:-}"
DB_NAME="${2:-ortmeier}"
DB_USER="${3:-otsapp}"

if [[ -z "$DB_ENDPOINT" ]]; then
  echo "Usage: $0 <db-endpoint> [db-name] [db-user]" >&2
  exit 1
fi

echo "Validating connection to $DB_ENDPOINT ..."
PGPASSWORD=$(aws secretsmanager get-secret-value --secret-id "ots-erp/prod/rds/password" --query SecretString --output text) \
psql "host=$DB_ENDPOINT dbname=$DB_NAME user=$DB_USER sslmode=require" -c "SELECT version();" || {
  echo "❌ Connection failed"
  exit 1
}
echo "✓ RDS reachable"