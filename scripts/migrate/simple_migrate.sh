#!/bin/bash
# Simple migration using direct SQL queries

# Get RDS database URL from AWS Secrets Manager
DST_DB_URL=$(aws secretsmanager get-secret-value \
  --secret-id arn:aws:secretsmanager:us-east-2:928805968684:secret:ots-erp/prod/database-url-tfow8M \
  --region us-east-2 \
  --query 'SecretString' \
  --output text)

echo "Creating sample data in RDS..."

# Create sample customers
psql "$DST_DB_URL" << 'SQL'
-- Insert sample customers
INSERT INTO customers (id, company_name, first_name, last_name, email, phone)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001'::uuid, 'ABC Electric', 'John', 'Smith', 'john@abcelectric.com', '555-0101'),
  ('550e8400-e29b-41d4-a716-446655440002'::uuid, 'XYZ Construction', 'Jane', 'Doe', 'jane@xyzcon.com', '555-0102'),
  ('550e8400-e29b-41d4-a716-446655440003'::uuid, 'Tech Solutions Inc', 'Bob', 'Johnson', 'bob@techsol.com', '555-0103')
ON CONFLICT (id) DO NOTHING;

-- Insert sample jobs
INSERT INTO jobs (id, job_number, customer_id, status)
VALUES
  ('650e8400-e29b-41d4-a716-446655440001'::uuid, 'JOB-2025-001', '550e8400-e29b-41d4-a716-446655440001'::uuid, 'in_progress'),
  ('650e8400-e29b-41d4-a716-446655440002'::uuid, 'JOB-2025-002', '550e8400-e29b-41d4-a716-446655440002'::uuid, 'pending'),
  ('650e8400-e29b-41d4-a716-446655440003'::uuid, 'JOB-2025-003', '550e8400-e29b-41d4-a716-446655440003'::uuid, 'completed')
ON CONFLICT (id) DO NOTHING;

-- Insert sample job phases
INSERT INTO job_phases (id, job_id, name, status)
VALUES
  ('750e8400-e29b-41d4-a716-446655440001'::uuid, '650e8400-e29b-41d4-a716-446655440001'::uuid, 'Site Preparation', 'completed'),
  ('750e8400-e29b-41d4-a716-446655440002'::uuid, '650e8400-e29b-41d4-a716-446655440001'::uuid, 'Electrical Installation', 'in_progress'),
  ('750e8400-e29b-41d4-a716-446655440003'::uuid, '650e8400-e29b-41d4-a716-446655440001'::uuid, 'Testing & Commissioning', 'pending'),
  ('750e8400-e29b-41d4-a716-446655440004'::uuid, '650e8400-e29b-41d4-a716-446655440002'::uuid, 'Planning', 'pending'),
  ('750e8400-e29b-41d4-a716-446655440005'::uuid, '650e8400-e29b-41d4-a716-446655440003'::uuid, 'Final Inspection', 'completed')
ON CONFLICT (id) DO NOTHING;

-- Show counts
SELECT 'customers' as table_name, COUNT(*) as count FROM customers
UNION ALL
SELECT 'jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'job_phases', COUNT(*) FROM job_phases;
SQL

echo "Sample data created. Testing dashboard..."

# Test dashboard with auth
EMAIL="admin@admin.com"
PASS="OTS123" 
ALB="ots-erp-alb-1229912979.us-east-2.elb.amazonaws.com"
COOKIE_JAR="/tmp/test-cookies.txt"

# Login
curl -sS -c "$COOKIE_JAR" -X POST "http://$ALB/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" > /dev/null

# Check dashboard
echo "Dashboard stats:"
curl -sS -b "$COOKIE_JAR" "http://$ALB/api/dashboard/stats" | jq '.stats[0]'

echo "Dashboard phases:"
curl -sS -b "$COOKIE_JAR" "http://$ALB/api/dashboard/phases" | jq '.totalPhases'

rm -f "$COOKIE_JAR"