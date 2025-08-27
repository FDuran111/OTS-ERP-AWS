#!/usr/bin/env bash
set -euo pipefail

DB_URL="$DATABASE_URL"
OUTFILE="supabase-dump-$(date +%F).sql"

if [[ -z "$DB_URL" ]]; then
  echo "❌ DATABASE_URL is required"
  exit 1
fi

echo "📤 Exporting Supabase database..."
pg_dump --no-owner --no-acl --schema=public --data-only "$DB_URL" > "$OUTFILE"
echo "✅ Exported to $OUTFILE"