#!/bin/bash
# Run RDS state check via ECS

REGION="us-east-2"
CLUSTER_NAME="ots-erp-cluster"
MIGRATOR_SG_ID="sg-0d73b5060991dbb3f"
TASK_DEFINITION="ots-erp-migrator-offline"
SUBNETS="subnet-069f28faec7b502a7,subnet-03a2211a8fbffcf38"

# Get RDS URL
DST_DB_URL=$(aws secretsmanager get-secret-value \
  --region "$REGION" \
  --secret-id "ots-erp/prod/database-url" \
  --query 'SecretString' \
  --output text)

# Create check command
CHECK_COMMAND=$(cat <<'EOCMD'
apt-get update && apt-get install -y postgresql-client && \
psql "$DST_DB_URL" -c "SELECT COUNT(*) as table_count FROM pg_tables WHERE schemaname='public';" && \
psql "$DST_DB_URL" -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LIMIT 30;" && \
psql "$DST_DB_URL" -c "SELECT 'Checking row counts:' as info;" && \
psql "$DST_DB_URL" -c "SELECT relname as table, n_live_tup as row_count FROM pg_stat_user_tables WHERE schemaname='public' ORDER BY n_live_tup DESC LIMIT 20;"
EOCMD
)

echo "Checking RDS state via ECS..."
TASK_ARN=$(aws ecs run-task \
  --region "$REGION" \
  --cluster "$CLUSTER_NAME" \
  --task-definition "$TASK_DEFINITION" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$MIGRATOR_SG_ID],assignPublicIp=ENABLED}" \
  --overrides "{
    \"containerOverrides\": [{
      \"name\": \"migrator\",
      \"command\": [\"/bin/bash\", \"-c\", \"$CHECK_COMMAND\"],
      \"environment\": [
        {\"name\": \"DST_DB_URL\", \"value\": \"$DST_DB_URL\"}
      ]
    }]
  }" \
  --query 'tasks[0].taskArn' \
  --output text)

echo "Task launched: $TASK_ARN"
echo "Waiting for completion..."

aws ecs wait tasks-stopped \
  --region "$REGION" \
  --cluster "$CLUSTER_NAME" \
  --tasks "$TASK_ARN"

echo ""
echo "=== TASK OUTPUT ==="
aws logs tail /ecs/ots-erp-migrator --since 2m --region "$REGION" | grep "${TASK_ARN##*/}" | tail -50