#!/bin/bash

# Test the bulk approval API endpoint
set -e

API_URL="https://0.0.0.0:5000"
ADMIN_EMAIL="admin@admin.com"
ADMIN_PASSWORD="OTS123"
JOB_ID="a13f0da8-88f2-454d-8a69-3db8b0b60bfd"
TECH_ID="739a33a0-a4ca-48b6-962b-2d504ab7d11d"
EMPLOYEE_ID="a4b0c5ac-1249-4849-ac85-3dc9e8fd8041"

echo "=========================================="
echo "Bulk Approval API Test"
echo "=========================================="

# Step 1: Login as admin
echo ""
echo "Step 1: Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  -c /tmp/admin-cookies.txt)

echo "Login response: $LOGIN_RESPONSE"
ADMIN_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "ERROR: Failed to get admin token"
  exit 1
fi

echo "✓ Admin logged in successfully"

# Step 2: Create 5 time entries in SUBMITTED status
echo ""
echo "Step 2: Creating 5 time entries..."
ENTRY_IDS=()

# Get today's date
TODAY=$(date +%Y-%m-%d)

# Create 3 entries for Tech employee
for i in 1 2 3; do
  echo "Creating entry $i for Tech employee..."
  CREATE_RESPONSE=$(curl -s -X POST "$API_URL/api/time-entries/direct" \
    -H "Content-Type: application/json" \
    -H "Cookie: auth-token=$ADMIN_TOKEN" \
    -d "{
      \"userId\": \"$TECH_ID\",
      \"jobId\": \"$JOB_ID\",
      \"date\": \"$TODAY\",
      \"hours\": 8.0,
      \"description\": \"Test entry $i - Tech\"
    }")
  
  ENTRY_ID=$(echo $CREATE_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -n "$ENTRY_ID" ]; then
    echo "Created entry: $ENTRY_ID"
    
    # Submit the entry
    SUBMIT_RESPONSE=$(curl -s -X POST "$API_URL/api/time-entries/$ENTRY_ID/submit" \
      -H "Content-Type: application/json" \
      -H "Cookie: auth-token=$ADMIN_TOKEN" \
      -d "{\"submittedBy\": \"$TECH_ID\"}")
    
    echo "Submitted entry: $ENTRY_ID"
    ENTRY_IDS+=("$ENTRY_ID")
  else
    echo "ERROR: Failed to create entry $i"
    echo "Response: $CREATE_RESPONSE"
  fi
done

# Create 2 entries for Employee
for i in 4 5; do
  echo "Creating entry $i for Employee..."
  CREATE_RESPONSE=$(curl -s -X POST "$API_URL/api/time-entries/direct" \
    -H "Content-Type: application/json" \
    -H "Cookie: auth-token=$ADMIN_TOKEN" \
    -d "{
      \"userId\": \"$EMPLOYEE_ID\",
      \"jobId\": \"$JOB_ID\",
      \"date\": \"$TODAY\",
      \"hours\": 8.0,
      \"description\": \"Test entry $i - Employee\"
    }")
  
  ENTRY_ID=$(echo $CREATE_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -n "$ENTRY_ID" ]; then
    echo "Created entry: $ENTRY_ID"
    
    # Submit the entry
    SUBMIT_RESPONSE=$(curl -s -X POST "$API_URL/api/time-entries/$ENTRY_ID/submit" \
      -H "Content-Type: application/json" \
      -H "Cookie: auth-token=$ADMIN_TOKEN" \
      -d "{\"submittedBy\": \"$EMPLOYEE_ID\"}")
    
    echo "Submitted entry: $ENTRY_ID"
    ENTRY_IDS+=("$ENTRY_ID")
  else
    echo "ERROR: Failed to create entry $i"
    echo "Response: $CREATE_RESPONSE"
  fi
done

echo ""
echo "✓ Created and submitted ${#ENTRY_IDS[@]} time entries"
echo "Entry IDs: ${ENTRY_IDS[@]}"

# Step 3: Bulk approve all entries with timing
echo ""
echo "Step 3: Bulk approving all entries..."

# Build JSON array of entry IDs
ENTRY_IDS_JSON="["
for i in "${!ENTRY_IDS[@]}"; do
  if [ $i -gt 0 ]; then
    ENTRY_IDS_JSON+=","
  fi
  ENTRY_IDS_JSON+="\"${ENTRY_IDS[$i]}\""
done
ENTRY_IDS_JSON+="]"

echo "Approving entries: $ENTRY_IDS_JSON"

# Measure response time
START_TIME=$(date +%s.%N)

BULK_APPROVE_RESPONSE=$(curl -s -X POST "$API_URL/api/time-entries/bulk-approve" \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=$ADMIN_TOKEN" \
  -d "{\"entryIds\": $ENTRY_IDS_JSON}")

END_TIME=$(date +%s.%N)
RESPONSE_TIME=$(echo "$END_TIME - $START_TIME" | bc)

echo ""
echo "Bulk approve response: $BULK_APPROVE_RESPONSE"
echo "Response time: ${RESPONSE_TIME}s"

# Check if response time is acceptable
if (( $(echo "$RESPONSE_TIME < 3.0" | bc -l) )); then
  echo "✓ Response time OK (${RESPONSE_TIME}s < 3s)"
else
  echo "⚠ Response time WARNING (${RESPONSE_TIME}s >= 3s)"
fi

# Extract approved count from response
APPROVED_COUNT=$(echo $BULK_APPROVE_RESPONSE | grep -o '"approved":[0-9]*' | cut -d':' -f2)

if [ "$APPROVED_COUNT" = "${#ENTRY_IDS[@]}" ]; then
  echo "✓ All ${#ENTRY_IDS[@]} entries approved successfully"
else
  echo "⚠ WARNING: Only $APPROVED_COUNT of ${#ENTRY_IDS[@]} entries approved"
fi

echo ""
echo "=========================================="
echo "Test completed. Check database verification below."
echo "=========================================="
echo ""
echo "Entry IDs for database verification:"
for ENTRY_ID in "${ENTRY_IDS[@]}"; do
  echo "  - $ENTRY_ID"
done
