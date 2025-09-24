#!/bin/bash
set -euo pipefail

echo "=== Critical Tables Migration ==="
echo "Migrating only the most important tables first"

# Source configuration
source .env.business

# Test connections
echo "Testing Supabase connection..."
if ! PGPASSWORD="Ortmeier789OTS" psql "$SRC_DB_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Cannot connect to Supabase"
    exit 1
fi
echo "✅ Supabase connection OK"

echo "Testing AWS RDS connection..."
if ! psql "$DST_DB_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Cannot connect to AWS RDS"
    exit 1
fi
echo "✅ AWS RDS connection OK"

# Critical tables in dependency order
TABLES=(
    "User"
    "Customer" 
    "Vendor"
    "LaborRate"
    "Material"
    "Job"
    "JobPhase"
    "Invoice"
    "TimeEntry"
)

echo ""
echo "=== Starting Migration ==="

for table in "${TABLES[@]}"; do
    echo ""
    echo "Migrating $table..."
    
    # Count source rows
    src_count=$(PGPASSWORD="Ortmeier789OTS" psql "$SRC_DB_URL" -t -c "SELECT COUNT(*) FROM public.\"$table\"" 2>/dev/null | tr -d ' ' || echo "0")
    echo "  Source rows: $src_count"
    
    if [ "$src_count" = "0" ]; then
        echo "  Skipping (empty table)"
        continue
    fi
    
    # Clear destination table
    psql "$DST_DB_URL" -c "DELETE FROM public.\"$table\"" 2>/dev/null || true
    
    # Copy data
    echo "  Copying data..."
    PGPASSWORD="Ortmeier789OTS" pg_dump "$SRC_DB_URL" \
        --table="public.\"$table\"" \
        --data-only \
        --no-owner \
        --no-privileges \
        --disable-triggers \
        --inserts \
        2>/dev/null | \
    psql "$DST_DB_URL" 2>&1 | grep -E "(INSERT|ERROR)" | tail -5
    
    # Count destination rows
    dst_count=$(psql "$DST_DB_URL" -t -c "SELECT COUNT(*) FROM public.\"$table\"" 2>/dev/null | tr -d ' ' || echo "0")
    echo "  Destination rows: $dst_count"
    
    if [ "$src_count" = "$dst_count" ]; then
        echo "  ✅ Success"
    else
        echo "  ⚠️  Row count mismatch!"
    fi
done

echo ""
echo "=== Migration Summary ==="
echo "Final row counts in AWS RDS:"
for table in "${TABLES[@]}"; do
    count=$(psql "$DST_DB_URL" -t -c "SELECT COUNT(*) FROM public.\"$table\"" 2>/dev/null | tr -d ' ' || echo "0")
    printf "  %-15s: %s\n" "$table" "$count"
done

echo ""
echo "✅ Critical tables migration complete!"