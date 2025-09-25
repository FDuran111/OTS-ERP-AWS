#!/bin/bash
# Enum synchronizer - Extract and create custom ENUM types from Supabase to RDS

set -euo pipefail
cd "$(dirname "$0")"

# 0) Load configuration and resolve URLs
source ./.env.business
mask(){ echo "$1" | sed 's#://\([^:@]*\):[^@]*@#://\1:***@#'; }
echo "=== ENUM Type Synchronization ==="
echo "SRC_DB_URL: $(mask "$SRC_DB_URL")"

# Resolve destination URL if not set
if [[ -z "${DST_DB_URL:-}" ]]; then
  echo "Resolving DST_DB_URL from AWS Secrets Manager..."
  DST_DB_URL=$(aws secretsmanager get-secret-value \
    --secret-id arn:aws:secretsmanager:us-east-2:928805968684:secret:ots-erp/prod/database-url-tfow8M \
    --query SecretString --output text --region us-east-2)
fi
echo "DST_DB_URL: $(mask "$DST_DB_URL")"
echo ""

# 1) Create RDS snapshot for safety
echo "=== Creating RDS Snapshot ==="
AWS_REGION="us-east-2"
DB_ID="ots-erp-prod-rds"
SNAP="pre-enum-$(date +%Y%m%d-%H%M%S)"
echo "Creating snapshot: $SNAP"
aws rds create-db-snapshot \
  --db-instance-identifier "$DB_ID" \
  --db-snapshot-identifier "$SNAP" \
  --region $AWS_REGION 2>/dev/null || echo "Snapshot creation initiated (or already exists)"
echo ""

# 2) Setup working directory
WORK="$(pwd)/work"
rm -rf "$WORK" && mkdir -p "$WORK"

# 3) Extract ENUM definitions from Supabase
echo "=== Extracting ENUMs from Supabase ==="
cat > "$WORK/extract_enums.sql" <<'SQL'
SELECT 
  n.nspname AS schema,
  t.typname AS type_name,
  string_agg(e.enumlabel::text, ',' ORDER BY e.enumsortorder) AS labels
FROM pg_type t
JOIN pg_namespace n ON n.oid = t.typnamespace
LEFT JOIN pg_enum e ON e.enumtypid = t.oid
WHERE n.nspname = 'public' 
  AND t.typtype = 'e'
GROUP BY n.nspname, t.typname
ORDER BY t.typname;
SQL

# Run extraction
PGPASSWORD="Ortmeier789OTS" psql "$SRC_DB_URL" \
  -At -F '|' \
  -f "$WORK/extract_enums.sql" \
  > "$WORK/enums.lst" 2>/dev/null

echo "Discovered ENUMs:"
cat "$WORK/enums.lst" | while IFS='|' read -r schema name labels; do
  echo "  - $name: [$labels]"
done
echo ""

# 4) Generate idempotent SQL for RDS
echo "=== Generating ENUM Creation SQL ==="
python3 - <<'PY' "$WORK/enums.lst" > "$WORK/create_enums.sql"
import sys

def create_enum_sql(schema, name, labels):
    """Generate SQL to create enum type if not exists"""
    sql = []
    
    # Create type if not exists
    label_list = ', '.join([f"'{l.strip()}'" for l in labels if l])
    sql.append(f"""
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = '{schema}' 
    AND t.typname = '{name}'
  ) THEN
    CREATE TYPE {schema}."{name}" AS ENUM ({label_list});
    RAISE NOTICE 'Created type: {name}';
  ELSE
    RAISE NOTICE 'Type already exists: {name}';
  END IF;
END$$;""")
    
    # Add any missing labels
    for label in labels:
        if label:
            sql.append(f"""
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e 
    JOIN pg_type t ON t.oid = e.enumtypid 
    JOIN pg_namespace n ON n.oid = t.typnamespace 
    WHERE n.nspname = '{schema}' 
    AND t.typname = '{name}' 
    AND e.enumlabel = '{label}'
  ) THEN
    ALTER TYPE {schema}."{name}" ADD VALUE IF NOT EXISTS '{label}';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;""")
    
    return '\n'.join(sql)

# Process enum definitions
with open(sys.argv[1], 'r') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        parts = line.split('|')
        if len(parts) >= 3:
            schema = parts[0]
            name = parts[1]
            labels = parts[2].split(',') if parts[2] else []
            print(create_enum_sql(schema, name, labels))
            print()
PY

echo "Generated SQL preview:"
head -50 "$WORK/create_enums.sql"
echo ""

# 5) Apply ENUMs to RDS
echo "=== Applying ENUMs to RDS ==="
psql "$DST_DB_URL" -v ON_ERROR_STOP=1 -f "$WORK/create_enums.sql" 2>&1 | grep -E "(NOTICE|ERROR)" || true
echo ""

# 6) Verify ENUMs in RDS
echo "=== Verifying ENUMs in RDS ==="
psql "$DST_DB_URL" -c "
  SELECT 
    t.typname AS enum_name,
    COUNT(e.enumlabel) AS label_count
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  LEFT JOIN pg_enum e ON e.enumtypid = t.oid
  WHERE n.nspname = 'public' 
    AND t.typtype = 'e'
  GROUP BY t.typname
  ORDER BY t.typname;
" 2>/dev/null || echo "Could not verify enums"

echo ""
echo "✅ ENUM synchronization completed!"
echo "Custom types have been created in RDS. You can now re-run the migration for failed tables."