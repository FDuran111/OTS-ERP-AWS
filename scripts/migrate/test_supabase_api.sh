#!/bin/bash
# Test Supabase REST API access

SUPABASE_URL="https://xudcmdliqyarbfdqufbq.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZGNtZGxpcXlhcmJmZHF1ZmJxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTgzODMzNSwiZXhwIjoyMDY1NDE0MzM1fQ._Pg8zzVMfNb--KpooQL7Q2V17gD4ilylIlKRt3nbGZE"

# Test API access to customers table
echo "Testing Supabase API access..."
curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/customers?select=*&limit=1" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo "Count customers:"
curl -s -X GET \
  "${SUPABASE_URL}/rest/v1/customers?select=count" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: count=exact" | jq '.'