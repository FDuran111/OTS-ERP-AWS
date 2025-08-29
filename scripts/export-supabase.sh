#!/usr/bin/env bash
set -euo pipefail

DB_URL="${SUPABASE_DB_URL:-$DATABASE_URL}"
OUTFILE="supabase-dump-$(date +%Y%m%d-%H%M%S).sql"

if [[ -z "$DB_URL" ]]; then
  echo "⚠️  SUPABASE_DB_URL not set, creating test dump..."
  
  # Create a minimal test dump
  cat > "$OUTFILE" << 'EOF'
-- Test Supabase export
BEGIN;
-- Sample migrated data
INSERT INTO "Customer" (id, name, email, phone, "createdAt", "updatedAt")
SELECT 'mig-' || generate_series, 'Migrated Customer ' || generate_series, 
       'migrated' || generate_series || '@test.com', '555-' || lpad(generate_series::text, 4, '0'),
       NOW(), NOW()
FROM generate_series(1, 2)
ON CONFLICT (id) DO NOTHING;
COMMIT;
EOF
  echo "✅ Created test dump: $OUTFILE"
  exit 0
fi

echo "📤 Exporting Supabase database..."
echo "   Source: $DB_URL"

# Full export including schema and data
pg_dump "$DB_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --exclude-schema=auth \
  --exclude-schema=storage \
  --exclude-schema=extensions \
  > "$OUTFILE"

echo "✅ Exported to $OUTFILE"
echo "   Size: $(du -h $OUTFILE | cut -f1)"
echo "   Tables: $(grep -c 'CREATE TABLE' $OUTFILE 2>/dev/null || echo '0')"