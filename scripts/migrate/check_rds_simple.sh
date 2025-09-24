#!/bin/bash
REGION="us-east-2"
CLUSTER_NAME="ots-erp-cluster"
MIGRATOR_SG_ID="sg-0d73b5060991dbb3f"
TASK_DEFINITION="ots-erp-migrator-offline"
SUBNETS="subnet-069f28faec7b502a7,subnet-03a2211a8fbffcf38"

DST_DB_URL=$(aws secretsmanager get-secret-value \
  --region "$REGION" \
  --secret-id "ots-erp/prod/database-url" \
  --query 'SecretString' \
  --output text)

echo "Checking RDS state..."
TASK_ARN=$(aws ecs run-task \
  --region "$REGION" \
  --cluster "$CLUSTER_NAME" \
  --task-definition "$TASK_DEFINITION" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$MIGRATOR_SG_ID],assignPublicIp=ENABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "migrator",
      "command": ["/bin/bash", "-c", "apt-get update && apt-get install -y postgresql-client && psql \"$DST_DB_URL\" -Atc \"SELECT COUNT(*) FROM pg_tables WHERE schemaname='\"'\"'public'\"'\"';\" && echo \"Tables in public:\" && psql \"$DST_DB_URL\" -Atc \"SELECT tablename FROM pg_tables WHERE schemaname='\"'\"'public'\"'\"' LIMIT 20;\""],
      "environment": [
        {"name": "DST_DB_URL", "value": "'"$DST_DB_URL"'"}
      ]
    }]
  }' \
  --query 'tasks[0].taskArn' \
  --output text)

echo "Task: $TASK_ARN"
echo "Waiting..."
aws ecs wait tasks-stopped --region "$REGION" --cluster "$CLUSTER_NAME" --tasks "$TASK_ARN"
echo "Logs:"
aws logs tail /ecs/ots-erp-migrator --since 2m --region "$REGION" | grep "${TASK_ARN##*/}" | tail -30
