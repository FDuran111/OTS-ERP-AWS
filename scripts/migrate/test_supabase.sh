#!/bin/bash

echo "=== Testing Supabase Connection ==="
echo "Password: Ortmeier789OTS"
echo "Project: xudcmdliqyarbfdqufbq"
echo ""

# Test with docker postgres container
echo "Testing with Docker postgres container:"
docker run --rm postgres:16 psql \
  "postgresql://postgres.xudcmdliqyarbfdqufbq:Ortmeier789OTS@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require" \
  -c "SELECT version();" 2>&1 | grep -E "(PostgreSQL|FATAL|ERROR)"

echo ""
echo "If you see 'Tenant or user not found', the password or project ID is incorrect."
echo "If you see 'PostgreSQL', the connection is working!"
echo ""
echo "Please verify in Supabase dashboard:"
echo "1. Go to https://supabase.com/dashboard/project/xudcmdliqyarbfdqufbq/settings/database"
echo "2. Under 'Connection string', check the 'Session pooler' tab"
echo "3. The format should match: postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
echo "4. Make sure you're using the DATABASE password, not the dashboard login password"