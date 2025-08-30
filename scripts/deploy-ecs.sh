#!/bin/bash
set -e

# Usage: ./deploy-ecs.sh <region> <cluster-name> <service-name>
# Example: ./deploy-ecs.sh us-east-2 ots-erp-cluster ots-erp-svc

REGION=${1:-us-east-2}
CLUSTER=${2:-ots-erp-cluster}
SERVICE=${3:-ots-erp-svc}

echo "🚀 Deploying to ECS..."
echo "   Region: ${REGION}"
echo "   Cluster: ${CLUSTER}"
echo "   Service: ${SERVICE}"

# Force new deployment
aws ecs update-service \
  --region ${REGION} \
  --cluster ${CLUSTER} \
  --service ${SERVICE} \
  --force-new-deployment \
  --query 'service.deployments[0]' \
  --output json

echo "✅ Deployment initiated!"
echo ""
echo "Monitor deployment status:"
echo "  aws ecs describe-services --region ${REGION} --cluster ${CLUSTER} --services ${SERVICE} --query 'services[0].deployments'"
echo ""
echo "View running tasks:"
echo "  aws ecs list-tasks --region ${REGION} --cluster ${CLUSTER} --service-name ${SERVICE}"