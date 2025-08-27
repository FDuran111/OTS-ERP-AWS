#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${RDS_PROXY_ENDPOINT:-}" || -z "${RDS_DB:-}" || -z "${RDS_USER:-}" || -z "${RDS_PASSWORD:-}" ]]; then
  echo "❌ RDS env vars required: RDS_PROXY_ENDPOINT, RDS_DB, RDS_USER, RDS_PASSWORD"
  exit 1
fi

FILE="${1:-supabase-dump.sql}"
if [[ ! -f "$FILE" ]]; then
  echo "❌ File not found: $FILE"
  exit 1
fi

echo "📥 Importing into RDS ($RDS_PROXY_ENDPOINT/$RDS_DB)..."
PGPASSWORD="$RDS_PASSWORD" psql -h "$RDS_PROXY_ENDPOINT" -U "$RDS_USER" -d "$RDS_DB" -f "$FILE"
echo "✅ Import complete"