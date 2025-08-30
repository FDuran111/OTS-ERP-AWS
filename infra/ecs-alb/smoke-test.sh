#!/bin/bash

ALB="$1"
REPORT_FILE="./smoke-report.json"
ERRORS=()
STATUS="ok"

echo "=== ECS ALB Smoke Test ==="
echo "ALB URL: http://$ALB"
echo ""

# Test basic routes
echo "1. Testing basic routes..."
ROOT_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "http://$ALB/")
LOGIN_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "http://$ALB/login")
DASHBOARD_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "http://$ALB/dashboard")
HEALTHZ_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" "http://$ALB/api/healthz")

echo "   / : $ROOT_STATUS"
echo "   /login : $LOGIN_STATUS"
echo "   /dashboard : $DASHBOARD_STATUS"
echo "   /api/healthz : $HEALTHZ_STATUS"

# Check health endpoint response
echo ""
echo "2. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -sS "http://$ALB/api/healthz")
echo "   Response: $HEALTH_RESPONSE"

# Test auth endpoint
echo ""
echo "3. Testing auth debug endpoint..."
AUTH_DEBUG=$(curl -sS "http://$ALB/api/auth/debug" | jq -c '.')
echo "   Response: $AUTH_DEBUG"

# Check for errors
if [ "$ROOT_STATUS" != "307" ]; then
    ERRORS+=("Root route expected 307, got $ROOT_STATUS")
    STATUS="partial"
fi

if [ "$LOGIN_STATUS" != "200" ]; then
    ERRORS+=("Login route expected 200, got $LOGIN_STATUS")
    STATUS="partial"
fi

if [ "$HEALTHZ_STATUS" != "200" ]; then
    ERRORS+=("Health endpoint expected 200, got $HEALTHZ_STATUS")
    STATUS="fail"
fi

# Generate report
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
cat > "$REPORT_FILE" << JSON
{
  "alb": "$ALB",
  "timestamp": "$TIMESTAMP",
  "status": "$STATUS",
  "routes": {
    "/": $ROOT_STATUS,
    "/login": $LOGIN_STATUS,
    "/dashboard": $DASHBOARD_STATUS,
    "/api/healthz": $HEALTHZ_STATUS
  },
  "health_check": $HEALTH_RESPONSE,
  "auth_debug": $AUTH_DEBUG,
  "errors": $(printf '%s\n' "${ERRORS[@]}" | jq -R . | jq -s .)
}
JSON

echo ""
echo "4. Report saved to $REPORT_FILE"
echo ""
echo "=== Summary ==="
echo "Status: $STATUS"
echo "Errors: ${#ERRORS[@]}"
if [ ${#ERRORS[@]} -gt 0 ]; then
    echo "Error details:"
    printf '  - %s\n' "${ERRORS[@]}"
fi

