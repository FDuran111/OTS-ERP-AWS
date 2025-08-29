#!/usr/bin/env bash
set -euo pipefail

# Use direct endpoint if proxy not available
RDS_HOST="${RDS_ENDPOINT:-${RDS_PROXY_ENDPOINT:-}}"

if [[ -z "$RDS_HOST" || -z "${RDS_DB:-}" || -z "${RDS_USER:-}" || -z "${RDS_PASSWORD:-}" ]]; then
  echo "❌ RDS env vars required: RDS_ENDPOINT/RDS_PROXY_ENDPOINT, RDS_DB, RDS_USER, RDS_PASSWORD"
  exit 1
fi

FILE="${1:-supabase-dump-*.sql}"
SSL_OPTS="${2:-}"

# Find the dump file
if [[ "$FILE" == *"*"* ]]; then
  FILE=$(ls -t $FILE 2>/dev/null | head -1)
fi

if [[ ! -f "$FILE" ]]; then
  echo "❌ File not found: $FILE"
  exit 1
fi

echo "📥 Importing into RDS..."
echo "   Host: $RDS_HOST"
echo "   Database: $RDS_DB"
echo "   File: $FILE ($(du -h $FILE | cut -f1))"

# Setup SSL if certificate exists
if [[ -f "/tmp/rds-ca.pem" ]]; then
  export PGSSLMODE="verify-full"
  export PGSSLROOTCERT="/tmp/rds-ca.pem"
  echo "   SSL: Enabled (verify-full)"
else
  export PGSSLMODE="require"
  echo "   SSL: Enabled (require)"
fi

# Import with error handling
PGPASSWORD="$RDS_PASSWORD" psql \
  -h "$RDS_HOST" \
  -U "$RDS_USER" \
  -d "$RDS_DB" \
  -v ON_ERROR_STOP=0 \
  -f "$FILE" 2>&1 | tee /tmp/import.log

# Summarize results
echo ""
echo "Import Summary:"
echo "  Tables created: $(grep -c 'CREATE TABLE' /tmp/import.log 2>/dev/null || echo '0')"
echo "  Inserts: $(grep -c 'INSERT' /tmp/import.log 2>/dev/null || echo '0')"
echo "  Errors: $(grep -c 'ERROR' /tmp/import.log 2>/dev/null || echo '0')"

if grep -q 'ERROR' /tmp/import.log 2>/dev/null; then
  echo ""
  echo "⚠️  Import completed with errors. First 5 errors:"
  grep 'ERROR' /tmp/import.log | head -5
else
  echo "✅ Import completed successfully"
fi