#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
source ./.env.business

mask(){ echo "$1" | sed 's#://.*:.*@#://***:***@#'; }

# Resolve DST_DB_URL if unset (use same secret ECS uses)
if [[ -z "${DST_DB_URL:-}" ]]; then
  secret_arn="arn:aws:secretsmanager:us-east-2:928805968684:secret:ots-erp/prod/database-url-tfow8M"
  if [[ -z "$secret_arn" ]]; then
    echo "ERROR: Cannot resolve RDS secret ARN from Terraform output. Set DST_DB_URL in .env.business"; exit 1;
  fi
  secret_json="$(aws secretsmanager get-secret-value --secret-id "$secret_arn" --region "${AWS_REGION:-us-east-2}" --query 'SecretString' --output text)"
  DST_DB_URL="$secret_json"
fi

[[ -n "${SRC_DB_URL:-}" ]] || { echo "ERROR: Set SRC_DB_URL in .env.business"; exit 1; }

echo "SRC_DB_URL: $(mask "$SRC_DB_URL")"
echo "DST_DB_URL: $(mask "$DST_DB_URL")"

WORK="$ROOT/work"
rm -rf "$WORK" && mkdir -p "$WORK"

# 2) Inventory (source & dest)
cat > "$WORK/_counts.sql" <<'SQL'
SELECT table_schema, table_name, reltuples::bigint AS approx_rows
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
ORDER BY table_name;
SQL

echo "== Source table counts (public) =="
docker run --rm --net=host postgres:16 bash -lc "PGSSLMODE=require psql '$SRC_DB_URL' -A -F',' -f /w/_counts.sql" -v "$WORK":/w | sed 's/^/SRC,/' || true

echo "== Dest table counts (public) before =="
docker run --rm --net=host postgres:16 bash -lc "PGSSLMODE=require psql '$DST_DB_URL' -A -F',' -f /w/_counts.sql" -v "$WORK":/w | sed 's/^/DST,/' || true

# 3) Create PascalCase compat views if missing
cat > "$WORK/_mkview.sql" <<'EOSQL'
DO $$
DECLARE tgt text; base text;
BEGIN
  -- helper function in SQL not convenient; handled per-table by env mapping.
END $$;
EOSQL

create_view(){
  local TGT="$1"; shift
  local CANDIDATES=("$@")
  local sql="DO \$\$ DECLARE found text; BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND c.relname='$TGT' AND c.relkind IN ('r','v')) THEN
      RAISE NOTICE '$TGT exists, skipping';
      RETURN;
    END IF;
  "
  for c in "${CANDIDATES[@]}"; do
    sql+="
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
               WHERE n.nspname='public' AND c.relname='${c}' AND c.relkind='r') THEN
      EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM public.%I;', '$TGT', '${c}');
      RAISE NOTICE 'Created view $TGT from ${c}';
      RETURN;
    END IF;"
  done
  sql+="
    RAISE NOTICE 'No base table found for $TGT (tried ${CANDIDATES[*]})';
  END \$\$;"
  docker run --rm --net=host postgres:16 bash -lc "PGSSLMODE=require psql '$DST_DB_URL' -v ON_ERROR_STOP=1 -c \"$sql\""
}

# Known maps
create_view "Customer"  customer customers client
create_view "Job"       job jobs work_order
create_view "JobPhase"  job_phase job_phases jobphase
create_view "Material"  material materials
create_view "TimeEntry" time_entry time_entries
create_view "Invoice"   invoice invoices
create_view "InvoiceItem" invoice_item invoice_items
create_view "File"      file files attachment attachments

# 4) Data copy (ordered)
echo "== Copy data in FK-safe order =="
OIFS="$IFS"; IFS=' '
for pair in $TABLE_ORDER; do
  src="${pair%%:*}"; tgt="${pair##*:}"
  echo "-- $src -> \"$tgt\""
  docker run --rm --net=host postgres:16 bash -lc "
    set -e
    exists=\$(PGSSLMODE=require psql '$SRC_DB_URL' -At -c \"SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$src'\")
    if [ \"\$exists\" != \"1\" ]; then echo 'SKIP: $src not found in source'; exit 0; fi
    PGSSLMODE=require pg_dump -a -t public.$src '$SRC_DB_URL' > /tmp/_${src}.sql
    # Rewrite target to PascalCase view/table
    sed -i \"s/public\\.$src/public.\\\"$tgt\\\"/g\" /tmp/_${src}.sql
    # Disable triggers during load to avoid FK issues
    echo 'SET session_replication_role = replica;' > /tmp/load_${src}.sql
    cat /tmp/_${src}.sql >> /tmp/load_${src}.sql
    echo 'SET session_replication_role = default;' >> /tmp/load_${src}.sql
    PGSSLMODE=require psql '$DST_DB_URL' -v ON_ERROR_STOP=1 -f /tmp/load_${src}.sql
    echo 'Loaded $src -> $tgt'
  "
done
IFS="$OIFS"

# 5) Reset sequences (generic)
cat > "$WORK/reset_sequences.sql" <<'SQL'
DO $$
DECLARE
    r RECORD;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      a.attname AS column_name,
      pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) AS seq
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0
    WHERE n.nspname='public' AND c.relkind='r'
  LOOP
    IF r.seq IS NOT NULL THEN
      EXECUTE format('SELECT setval(%L, GREATEST(COALESCE(MAX(%I),0)+1,1), false) FROM %I.%I',
                     r.seq, r.column_name, 'public', r.table_name);
    END IF;
  END LOOP;
END $$;
SQL
docker run --rm --net=host -v "$WORK":/w postgres:16 bash -lc "PGSSLMODE=require psql '$DST_DB_URL' -v ON_ERROR_STOP=1 -f /w/reset_sequences.sql"

# 6) Verify counts again (dest)
echo "== Dest table counts (public) after =="
docker run --rm --net=host postgres:16 bash -lc "PGSSLMODE=require psql '$DST_DB_URL' -A -F',' -f /w/_counts.sql" -v "$WORK":/w | sed 's/^/DST,/' || true

# 7) Minimal functional check via ALB (login + phases)
alb="ots-erp-alb-1229912979.us-east-2.elb.amazonaws.com"
if [[ -n "$alb" ]]; then
  EMAIL="admin@admin.com"; PASS="OTS123"; CJ="$(mktemp)"
  curl -sS -c "$CJ" -X POST "http://$alb/api/auth/login" -H "content-type: application/json" \
    --data "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" >/dev/null || true
  echo "-- /api/dashboard/phases (auth) --"
  curl -sS -b "$CJ" -i "http://$alb/api/dashboard/phases" | sed -n '1,25p'
  rm -f "$CJ"
fi

echo "DONE. Data migration attempted. Review counts above."