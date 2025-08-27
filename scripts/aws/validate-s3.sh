#!/usr/bin/env bash
set -euo pipefail

BUCKET="${1:-}"
REGION="${2:-us-east-2}"

if [[ -z "$BUCKET" ]]; then
  echo "Usage: $0 <bucket-name> [region]" >&2
  exit 1
fi

echo "Checking bucket: $BUCKET in $REGION"
aws s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1 && echo "✓ Bucket exists"

echo "Listing 5 objects (if any):"
aws s3api list-objects-v2 --bucket "$BUCKET" --max-keys 5 --query 'Contents[].Key' --output table || true

echo "Generating presigned PUT (60s):"
URL=$(aws s3 presign "s3://$BUCKET/healthcheck.txt" --expires-in 60 --region "$REGION" --cli-read-timeout 5 --cli-connect-timeout 5)
echo "Presigned URL: $URL"
echo "Try:  curl -X PUT --data 'ok' \"$URL\""