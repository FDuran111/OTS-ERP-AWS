#!/usr/bin/env bash
# run_phase1_database_setup.sh
# Phase 1 Orchestrator: Wipe → Rebuild → Migrate → Verify (True Replica)
# Requires: psql, pg_dump, pg_restore, awscli
set -Eeuo pipefail

########################################
# Helpers
########################################
log()   { printf "\n[%s] %s\n" "$(date +'%F %T')" "$*"; }
die()   { printf "\n[ERROR] %s\n" "$*" >&2; exit 1; }
need()  { command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"; }

########################################
# Preflight
########################################
need psql
need pg_dump
need pg_restore
need aws

: "${SRC_DB_URL:?Missing SRC_DB_URL (Supabase/Coolify). Include sslmode=require.}"
AWS_REGION="${AWS_REGION:-us-east-2}"
ARTIFACTS_S3="${ARTIFACTS_S3:-ots-erp-prod-uploads}"

# Resolve DST_DB_URL from Secrets Manager if not set
if [[ -z "${DST_DB_URL:-}" ]]; then
  if [[ -n "${DST_DB_SECRET_ARN:-}" ]]; then
    DST_DB_URL="$(aws secretsmanager get-secret-value \
      --region "$AWS_REGION" \
      --secret-id "$DST_DB_SECRET_ARN" \
      --query 'SecretString' --output text)"
  else
    # Default secret name used in your ground-truth report
    if aws secretsmanager describe-secret --region "$AWS_REGION" --secret-id "ots-erp/prod/database-url" >/dev/null 2>&1; then
      DST_DB_URL="$(aws secretsmanager get-secret-value \
        --region "$AWS_REGION" \
        --secret-id 'ots-erp/prod/database-url' \
        --query 'SecretString' --output text)"
    fi
  fi
fi
: "${DST_DB_URL:?Missing DST_DB_URL (RDS). Provide DST_DB_URL or DST_DB_SECRET_ARN.}"

# Sanity guardrails
[[ "$SRC_DB_URL" == *"supabase.co"* ]] || log "WARN: SRC_DB_URL does not look like Supabase."
[[ "$DST_DB_URL" == *"rds.amazonaws.com"* ]] || log "WARN: DST_DB_URL does not look like RDS."

WORKDIR="true_replica_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$WORKDIR"
SCHEMA_DUMP="$WORKDIR/schema.dump"       # custom format (for pg_restore)
SCHEMA_SQL="$WORKDIR/schema.sql"         # plain SQL (filtered)
DATA_DUMP="$WORKDIR/data.dump"           # custom format (data-only)
WIPE_SQL="$WORKDIR/wipe.sql"
VERIFY_REPORT="$WORKDIR/verify_counts.tsv"
SEQ_FIX_SQL="$WORKDIR/fix_sequences.sql"
META_JSON="$WORKDIR/meta.json"

log "Environment:"
echo "{\"src\":\"[REDACTED]\",\"dst\":\"[REDACTED]\",\"region\":\"$AWS_REGION\",\"artifacts_s3\":\"$ARTIFACTS_S3\",\"workdir\":\"$WORKDIR\"}" \
  | tee "$META_JSON"

########################################
# Connectivity checks
########################################
log "Checking connectivity to Source (Supabase)…"
psql "$SRC_DB_URL" -Atc "select current_database(), current_user, version();" || die "Cannot connect to Supabase"

log "Checking connectivity to Destination (RDS)…"
psql "$DST_DB_URL" -Atc "select current_database(), current_user, version();" || die "Cannot connect to RDS"

########################################
# Build the Wipe script (user-created objects only)
########################################
cat > "$WIPE_SQL" <<'SQL'
BEGIN;

-- Drop views & materialized views
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, viewname FROM pg_views WHERE schemaname='public'
  LOOP EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE;', r.schemaname, r.viewname); END LOOP;

  FOR r IN SELECT schemaname, matviewname FROM pg_matviews WHERE schemaname='public'
  LOOP EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I CASCADE;', r.schemaname, r.matviewname); END LOOP;
END$$;

-- Drop triggers
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT event_object_table AS tbl, trigger_name AS trg
    FROM information_schema.triggers
    WHERE trigger_schema='public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I;', r.trg, r.tbl);
  END LOOP;
END$$;

-- Drop functions (excluding extension-owned)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema, p.proname AS func, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
    WHERE n.nspname='public'
      AND d.objid IS NULL  -- Exclude extension dependencies
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE;', r.schema, r.func, r.args);
  END LOOP;
END$$;

-- Drop tables (preserve schema_migrations if present)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname='public'
      AND tablename NOT IN ('schema_migrations')
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE;', r.tablename);
  END LOOP;
END$$;

-- Drop user-defined types (enums/domains/composites)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT t.typname
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname='public'
      AND t.typtype IN ('e','c','d')
      AND t.typname NOT LIKE '\_%' ESCAPE '\'
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE;', r.typname);
  END LOOP;
END$$;

COMMIT;
SQL

########################################
# 1) WIPE
########################################
log "Wiping user-created objects in RDS (public schema)…"
psql "$DST_DB_URL" -v ON_ERROR_STOP=1 -f "$WIPE_SQL"

########################################
# 2) REBUILD SCHEMA (dump from source → filter → restore to RDS)
########################################
log "Dumping schema from Supabase (custom & plain formats)…"
pg_dump "$SRC_DB_URL" --schema-only --no-owner --no-privileges -n public -Fc -f "$SCHEMA_DUMP"
pg_dump "$SRC_DB_URL" --schema-only --no-owner --no-privileges -n public -f "$SCHEMA_SQL"

# Filter out extension statements (Supabase has many not available in RDS)
log "Filtering out extension lines from plain SQL (for visibility/debug)…"
sed -i.bak -E '/EXTENSION|extension/Id' "$SCHEMA_SQL" || true

# Pre-create common extensions that app defaults rely on (ignore failures)
log "Ensuring common extensions exist on RDS (pgcrypto, uuid-ossp, pg_trgm)…"
psql "$DST_DB_URL" -v ON_ERROR_STOP=0 <<'SQL'
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
SQL

# Restore schema from custom dump (more robust order handling)
log "Restoring schema to RDS via pg_restore…"
pg_restore -e -x -O -n public -d "$DST_DB_URL" "$SCHEMA_DUMP" || {
  log "Schema restore had errors. Attempting plain SQL restore as fallback…"
  psql "$DST_DB_URL" -v ON_ERROR_STOP=0 -f "$SCHEMA_SQL"
}

########################################
# 3) MIGRATE DATA (data-only dump → restore with triggers disabled)
########################################
log "Dumping DATA from Supabase (custom format)…"
pg_dump "$SRC_DB_URL" --data-only --no-owner --no-privileges -n public -Fc -f "$DATA_DUMP"

log "Restoring DATA to RDS (single txn, triggers disabled)…"
pg_restore --data-only --disable-triggers --single-transaction -e -d "$DST_DB_URL" "$DATA_DUMP" || {
  log "Data restore failed. Check $DATA_DUMP for issues."
  exit 1
}

# Fix sequences to MAX(id)
log "Generating sequence fixups…"
cat > "$SEQ_FIX_SQL" <<'SQL'
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT
      seq.relname AS seq_name,
      tbl.relname AS tbl_name,
      att.attname AS col_name
    FROM pg_class seq
    JOIN pg_depend d    ON d.objid = seq.oid AND d.deptype = 'a'
    JOIN pg_class  tbl  ON d.refobjid = tbl.oid
    JOIN pg_attribute att ON att.attrelid = tbl.oid AND att.attnum = d.refobjsubid
    JOIN pg_namespace n ON n.oid = seq.relnamespace
    WHERE seq.relkind = 'S' AND n.nspname = 'public'
  LOOP
    EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I.%I), 0) + 1, false);',
                   'public.'||r.seq_name, r.col_name, 'public', r.tbl_name);
  END LOOP;
END$$;
SQL
log "Applying sequence fixups…"
psql "$DST_DB_URL" -v ON_ERROR_STOP=1 -f "$SEQ_FIX_SQL"

########################################
# 4) VERIFY (table-by-table counts)
########################################
log "Computing table counts in SOURCE…"
SRC_COUNTS="$WORKDIR/src_counts.tsv"
psql "$SRC_DB_URL" -Atc \
"SELECT tablename, (SELECT COUNT(*) FROM public.\"\"||tablename||\"\" )::bigint
 FROM pg_tables WHERE schemaname='public' ORDER BY 1;" \
| tee "$SRC_COUNTS"

log "Computing table counts in DESTINATION…"
DST_COUNTS="$WORKDIR/dst_counts.tsv"
psql "$DST_DB_URL" -Atc \
"SELECT tablename, (SELECT COUNT(*) FROM public.\"\"||tablename||\"\" )::bigint
 FROM pg_tables WHERE schemaname='public' ORDER BY 1;" \
| tee "$DST_COUNTS"

log "Joining counts and writing report…"
# join requires sorted files; ensured by ORDER BY above
join -t $'\t' -a1 -a2 -e "0" -o 0,1.2,2.2 "$SRC_COUNTS" "$DST_COUNTS" \
  > "$VERIFY_REPORT" || true

log "Verification Summary (table | src | dst | delta):"
echo "----------------------------------------"
printf "%-30s %10s %10s %10s\n" "TABLE" "SOURCE" "DEST" "DELTA"
echo "----------------------------------------"
awk -F'\t' '{delta=$2-$3; printf "%-30s %10d %10d %10d\n",$1,$2,$3,delta}' "$VERIFY_REPORT"
echo "----------------------------------------"

# Quick fail if any mismatch (you can relax this if desired)
MISMATCHES=$(awk -F'\t' '$2 != $3 {c++} END{print c+0}' "$VERIFY_REPORT")
if [[ "$MISMATCHES" -gt 0 ]]; then
  log "❌ Row count mismatches detected in $MISMATCHES table(s). See $VERIFY_REPORT"
  # Continue anyway but note the issue
  FINAL_STATUS="COMPLETED_WITH_MISMATCHES"
else
  log "✅ Row counts match for all public tables."
  FINAL_STATUS="SUCCESS"
fi

########################################
# Archive artifacts
########################################
log "Uploading artifacts to s3://$ARTIFACTS_S3/migrations/$WORKDIR/ …"
aws s3 cp "$WORKDIR/" "s3://$ARTIFACTS_S3/migrations/$WORKDIR/" --recursive --region "$AWS_REGION" || \
  log "WARN: S3 upload failed (non-fatal)."

########################################
# Final Report
########################################
cat <<EOF

================================================================================
PHASE 1 DATABASE SETUP COMPLETE
================================================================================
Status: $FINAL_STATUS
Workdir: $WORKDIR
Artifacts: s3://$ARTIFACTS_S3/migrations/$WORKDIR/

Key Files:
- Schema dump: $SCHEMA_DUMP
- Data dump: $DATA_DUMP  
- Verification: $VERIFY_REPORT

Tables migrated: $(wc -l < "$SRC_COUNTS")
Total mismatches: $MISMATCHES

Next Steps:
1. Review verification report if mismatches exist
2. Test application connectivity
3. Verify critical queries work as expected
================================================================================
EOF

if [[ "$FINAL_STATUS" == "SUCCESS" ]]; then
  exit 0
else
  exit 2
fi