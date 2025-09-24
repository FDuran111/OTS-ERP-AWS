#!/usr/bin/env bash
# run_phase1_ecs.sh
# Runs the Phase 1 database setup in ECS Fargate (required for RDS access)
set -euo pipefail

# Configuration
REGION="us-east-2"
CLUSTER_NAME="ots-erp-cluster"
MIGRATOR_SG_ID="sg-0d73b5060991dbb3f"
TASK_DEFINITION="ots-erp-migrator-offline"
S3_BUCKET="ots-erp-prod-uploads"

echo "=========================================="
echo "PHASE 1: Complete Database Wipe & Rebuild"
echo "=========================================="
echo ""
echo "This will:"
echo "1. WIPE all data in RDS (complete reset)"
echo "2. Copy complete schema from Supabase"
echo "3. Migrate all data from Supabase"
echo "4. Verify row counts match"
echo ""
read -p "Are you SURE you want to wipe RDS and rebuild from Supabase? (type 'yes' to confirm): " CONFIRM

if [[ "$CONFIRM" != "yes" ]]; then
  echo "Aborted."
  exit 1
fi

# Upload the script and env file to S3
echo "Uploading Phase 1 scripts to S3..."
cd "$(dirname "$0")"
tar czf phase1_bundle.tar.gz run_phase1_database_setup.sh .env.phase1
aws s3 cp phase1_bundle.tar.gz "s3://${S3_BUCKET}/migrations/phase1_bundle.tar.gz" --region "$REGION"

# Use public subnets for internet access to Supabase
echo "Using public subnets for internet connectivity..."
SUBNETS="subnet-069f28faec7b502a7,subnet-03a2211a8fbffcf38"

# Get the RDS database URL from Secrets Manager
echo "Fetching RDS database URL from Secrets Manager..."
DST_DB_URL=$(aws secretsmanager get-secret-value \
  --region "$REGION" \
  --secret-id "ots-erp/prod/database-url" \
  --query 'SecretString' \
  --output text)

# Create the ECS command that will run in the container
CONTAINER_COMMAND=$(cat <<'EOCMD'
apt-get update && \
apt-get install -y postgresql-client awscli && \
cd /tmp && \
aws s3 cp s3://ots-erp-prod-uploads/migrations/phase1_bundle.tar.gz . && \
tar xzf phase1_bundle.tar.gz && \
chmod +x run_phase1_database_setup.sh && \
./run_phase1_database_setup.sh
EOCMD
)

# Run the task
echo "Launching Phase 1 migration task in ECS..."
TASK_ARN=$(aws ecs run-task \
  --region "$REGION" \
  --cluster "$CLUSTER_NAME" \
  --task-definition "$TASK_DEFINITION" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$MIGRATOR_SG_ID],assignPublicIp=ENABLED}" \
  --overrides "{
    \"containerOverrides\": [{
      \"name\": \"migrator\",
      \"command\": [\"/bin/bash\", \"-c\", \"$CONTAINER_COMMAND\"],
      \"environment\": [
        {\"name\": \"PGPASSWORD\", \"value\": \"ORT1tech2Serv\"},
        {\"name\": \"DST_DB_URL\", \"value\": \"$DST_DB_URL\"},
        {\"name\": \"SRC_DB_URL\", \"value\": \"postgresql://postgres.xudcmdliqyarbfdqufbq:ORT1tech2Serv@aws-0-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require\"},
        {\"name\": \"AWS_REGION\", \"value\": \"us-east-2\"},
        {\"name\": \"ARTIFACTS_S3\", \"value\": \"ots-erp-prod-uploads\"}
      ]
    }]
  }" \
  --query 'tasks[0].taskArn' \
  --output text)

echo "Task launched: $TASK_ARN"
echo "Waiting for completion..."

# Wait for task to complete
aws ecs wait tasks-stopped \
  --region "$REGION" \
  --cluster "$CLUSTER_NAME" \
  --tasks "$TASK_ARN"

# Get exit code
EXIT_CODE=$(aws ecs describe-tasks \
  --region "$REGION" \
  --cluster "$CLUSTER_NAME" \
  --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].exitCode' \
  --output text)

echo ""
echo "Task completed with exit code: $EXIT_CODE"

# Show logs
echo ""
echo "=== TASK LOGS (last 100 lines) ==="
aws logs tail /ecs/ots-erp-migrator --since 10m --region "$REGION" | tail -100

if [[ "$EXIT_CODE" == "0" ]]; then
  echo ""
  echo "✅ PHASE 1 COMPLETE: Database has been rebuilt from Supabase"
  echo ""
  echo "Next steps:"
  echo "1. Test application connectivity"
  echo "2. Verify critical features work"
  echo "3. Check migration artifacts in S3"
else
  echo ""
  echo "❌ PHASE 1 FAILED with exit code $EXIT_CODE"
  echo "Check the logs above for details"
  exit 1
fi