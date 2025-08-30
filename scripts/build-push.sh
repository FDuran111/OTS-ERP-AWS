#!/bin/bash
set -e

# Usage: ./build-push.sh <region> <ecr-repo-name>
# Example: ./build-push.sh us-east-2 ots-erp/app

REGION=${1:-us-east-2}
ECR_REPO=${2:-ots-erp/app}

# Get AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URL="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
REPO_URL="${ECR_URL}/${ECR_REPO}"

# Get git SHA for tagging
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "manual")

echo "🔐 Logging into ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ECR_URL}

echo "🏗️  Building Docker image (linux/amd64)..."
docker build --platform linux/amd64 -t ${ECR_REPO}:${GIT_SHA} -t ${ECR_REPO}:latest .

echo "🏷️  Tagging images..."
docker tag ${ECR_REPO}:${GIT_SHA} ${REPO_URL}:${GIT_SHA}
docker tag ${ECR_REPO}:latest ${REPO_URL}:latest

echo "📤 Pushing images to ECR..."
docker push ${REPO_URL}:${GIT_SHA}
docker push ${REPO_URL}:latest

echo "✅ Build complete!"
echo "IMAGE=${REPO_URL}:${GIT_SHA}"
echo "LATEST=${REPO_URL}:latest"