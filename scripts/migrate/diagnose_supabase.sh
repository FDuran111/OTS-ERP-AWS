#!/bin/bash
# Supabase connectivity diagnostician

set -euo pipefail

# Navigate to scripts/migrate directory
cd "$(dirname "$0")" || { echo "Failed to navigate to script directory"; exit 1; }

# Check for .env.business file
test -f .env.business || { echo "Missing .env.business"; exit 1; }

# Function to mask passwords in URLs
mask(){ echo "$1" | sed 's#://\([^:@]*\):[^@]*@#://\1:***@#'; }

echo "=== READ .env.business (masked) ==="
# Extract URLs from .env.business
SRC_DB_URL="$(grep -E '^SRC_DB_URL=' .env.business | sed 's/^SRC_DB_URL=//')"
DST_DB_URL="$(grep -E '^DST_DB_URL=' .env.business | sed 's/^DST_DB_URL=//')"
echo "SRC_DB_URL: $(mask "${SRC_DB_URL:-<empty>}")"
echo "DST_DB_URL: $(mask "${DST_DB_URL:-<empty>}")"

if [[ -z "${SRC_DB_URL:-}" ]]; then
  echo "ERROR: SRC_DB_URL is empty in .env.business"; exit 1;
fi

### 1) Parse & validate the Supabase URI structure
echo "=== Validating URI structure ==="
python3 - <<'PY' "$SRC_DB_URL"
import sys, urllib.parse, re
u = urllib.parse.urlparse(sys.argv[1].strip())
errors=[]
if u.scheme not in ('postgres','postgresql'):
    errors.append(f"scheme must be postgres/postgresql, got {u.scheme!r}")
if not u.hostname:
    errors.append("hostname missing (e.g., aws-0-us-east-1.pooler.supabase.com or db.<ref>.supabase.co)")
if not u.username:
    errors.append("username missing (often 'postgres' for Supabase)")
if not u.password:
    errors.append("password missing (must be the *database password*, not a Supabase API key)")
if not u.path or u.path == '/':
    errors.append("database name missing (often 'postgres')")
port = u.port or 0
if port not in (5432, 6543):
    errors.append(f"unexpected port {port}; Supabase uses 5432 (direct) or 6543 (pooler)")
q = urllib.parse.parse_qs(u.query)
if 'sslmode' not in q:
    errors.append("sslmode missing; add ?sslmode=require")
print("URI CHECK:", "OK" if not errors else "INVALID")
for e in errors: print(" -", e)
if not errors:
    print(f"Host: {u.hostname}")
    print(f"Port: {u.port}")
    print(f"User: {u.username}")
    print(f"Database: {u.path.strip('/')}")
PY

### 2) DNS & port reachability
echo "=== Testing network connectivity ==="
host="$(python3 -c "import sys, urllib.parse; print(urllib.parse.urlparse(sys.argv[1]).hostname or '')" "$SRC_DB_URL")"
port="$(python3 -c "import sys, urllib.parse; print(urllib.parse.urlparse(sys.argv[1]).port or 5432)" "$SRC_DB_URL")"
echo "Testing reachability to $host:$port"

# Test DNS resolution
echo -n "DNS Resolution: "
if dig +short "$host" > /dev/null 2>&1; then
    echo "OK ($(dig +short "$host" | head -1))"
else
    echo "FAILED"
fi

# Test port connectivity
echo -n "Port connectivity: "
if nc -zv "$host" "$port" 2>&1 | grep -q succeeded; then
    echo "OK"
else
    echo "FAILED"
fi

### 3) psql connectivity test
echo "=== Testing psql connection ==="
echo "Attempting connection with provided password..."

# Create a temporary pgpass file for secure password handling
PGPASS_FILE=$(mktemp)
chmod 600 "$PGPASS_FILE"

# Extract connection details
PG_HOST="$(python3 -c "import sys, urllib.parse; print(urllib.parse.urlparse(sys.argv[1]).hostname)" "$SRC_DB_URL")"
PG_PORT="$(python3 -c "import sys, urllib.parse; print(urllib.parse.urlparse(sys.argv[1]).port or 5432)" "$SRC_DB_URL")"
PG_USER="$(python3 -c "import sys, urllib.parse; print(urllib.parse.urlparse(sys.argv[1]).username)" "$SRC_DB_URL")"
PG_PASS="$(python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(urllib.parse.urlparse(sys.argv[1]).password))" "$SRC_DB_URL")"
PG_DB="$(python3 -c "import sys, urllib.parse; print(urllib.parse.urlparse(sys.argv[1]).path.strip('/'))" "$SRC_DB_URL")"

echo "$PG_HOST:$PG_PORT:$PG_DB:$PG_USER:$PG_PASS" > "$PGPASS_FILE"

# Test connection
export PGPASSFILE="$PGPASS_FILE"
export PGSSLMODE=require

if psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -c "SELECT version(), current_user, current_database();" 2>&1; then
    echo "✅ PASSWORD WORKS! Connection successful!"
    
    # Test table access
    echo "=== Testing table access ==="
    psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -c "
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name 
        LIMIT 10;
    " 2>&1 || true
    
    # Count important tables
    echo "=== Counting rows in key tables ==="
    for table in User Customer Job Material; do
        echo -n "$table: "
        psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -t -c "
            SELECT COUNT(*) FROM public.\"$table\"
        " 2>&1 | tr -d ' ' || echo "N/A"
    done
    
else
    echo "❌ CONNECTION FAILED with provided password"
    echo ""
    echo "=== Troubleshooting ==="
    echo "1. The password may be incorrect"
    echo "2. To reset in Supabase:"
    echo "   - Go to https://xudcmdliqyarbfdqufbq.supabase.co"
    echo "   - Navigate to Settings > Database"
    echo "   - Click 'Reset Database Password'"
    echo "   - Use the new password in .env.business"
    echo ""
    echo "3. Check if IP allowlist is enabled:"
    echo "   - Go to Database > Network Access"
    echo "   - Ensure 0.0.0.0/0 is allowed OR add your IP"
fi

# Cleanup
rm -f "$PGPASS_FILE"

### 4) Identify public IPs that might need allowlisting
echo ""
echo "=== Public IPs (for Supabase allowlist if needed) ==="
echo -n "Your current IP: "
curl -s https://ifconfig.me 2>/dev/null || echo "unknown"
echo ""

# Check AWS NAT Gateway IPs
echo "AWS NAT Gateway IPs (if running from ECS):"
aws ec2 describe-nat-gateways --region us-east-2 \
    --query 'NatGateways[?State==`available`].NatGatewayAddresses[].PublicIp' \
    --output text 2>/dev/null || echo "No NAT gateways found"

echo ""
echo "=== Summary ==="
if psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Supabase connection is WORKING"
    echo "✅ Password is CORRECT"
    echo "✅ Ready to run migration"
else
    echo "❌ Cannot connect to Supabase"
    echo "❌ Password may be incorrect or network access blocked"
    echo "   Action: Reset password in Supabase dashboard or check IP allowlist"
fi