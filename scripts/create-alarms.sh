#!/bin/bash

# create-alarms.sh - Create CloudWatch alarms for RDS monitoring
set -e

echo "============================================"
echo "=== CloudWatch Alarms Setup ==="
echo "============================================"
echo ""

# Configuration
REGION="us-east-2"
RDS_INSTANCE="ots-erp-prod-rds"
SNS_TOPIC_NAME="ots-erp-alerts"
EMAIL_ADDRESS="${ALARM_EMAIL:-admin@ortmeier.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "RDS Instance: $RDS_INSTANCE"
echo "Region: $REGION"
echo "Alert Email: $EMAIL_ADDRESS"
echo ""

# Function to create or update alarm
create_alarm() {
  local ALARM_NAME=$1
  local METRIC_NAME=$2
  local THRESHOLD=$3
  local COMPARISON=$4
  local DESCRIPTION=$5
  local UNIT=$6
  local STATISTIC=${7:-Average}
  
  echo -n "  Creating $ALARM_NAME... "
  
  aws cloudwatch put-metric-alarm \
    --alarm-name "$ALARM_NAME" \
    --alarm-description "$DESCRIPTION" \
    --metric-name "$METRIC_NAME" \
    --namespace "AWS/RDS" \
    --statistic "$STATISTIC" \
    --period 300 \
    --threshold $THRESHOLD \
    --comparison-operator "$COMPARISON" \
    --evaluation-periods 2 \
    --datapoints-to-alarm 2 \
    --dimensions Name=DBInstanceIdentifier,Value=$RDS_INSTANCE \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --ok-actions "$SNS_TOPIC_ARN" \
    --treat-missing-data notBreaching \
    --unit "$UNIT" \
    --region $REGION 2>/dev/null
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
    return 0
  else
    echo -e "${RED}✗${NC}"
    return 1
  fi
}

echo "1. SETTING UP SNS TOPIC"
echo "========================"

# Check if SNS topic exists
SNS_TOPIC_ARN=$(aws sns list-topics --region $REGION 2>/dev/null | \
  jq -r ".Topics[] | select(.TopicArn | contains(\"$SNS_TOPIC_NAME\")) | .TopicArn")

if [ -z "$SNS_TOPIC_ARN" ]; then
  echo "Creating SNS topic: $SNS_TOPIC_NAME"
  SNS_TOPIC_ARN=$(aws sns create-topic --name $SNS_TOPIC_NAME --region $REGION --output text 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SNS topic created: $SNS_TOPIC_ARN${NC}"
    
    # Subscribe email to topic
    echo -n "  Subscribing email $EMAIL_ADDRESS... "
    aws sns subscribe \
      --topic-arn $SNS_TOPIC_ARN \
      --protocol email \
      --notification-endpoint $EMAIL_ADDRESS \
      --region $REGION 2>/dev/null
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓${NC}"
      echo -e "${YELLOW}  ⚠ Check your email to confirm the subscription${NC}"
    else
      echo -e "${RED}✗${NC}"
    fi
  else
    echo -e "${RED}✗ Failed to create SNS topic${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓ Using existing SNS topic: $SNS_TOPIC_ARN${NC}"
fi

echo ""
echo "2. CREATING RDS ALARMS"
echo "======================"

# Verify RDS instance exists
RDS_INFO=$(aws rds describe-db-instances --db-instance-identifier $RDS_INSTANCE --region $REGION 2>/dev/null)
if [ $? -ne 0 ]; then
  echo -e "${RED}✗ RDS instance $RDS_INSTANCE not found${NC}"
  exit 1
fi

# Get RDS instance class for appropriate thresholds
INSTANCE_CLASS=$(echo $RDS_INFO | jq -r '.DBInstances[0].DBInstanceClass')
ALLOCATED_STORAGE=$(echo $RDS_INFO | jq -r '.DBInstances[0].AllocatedStorage')
echo "Instance Class: $INSTANCE_CLASS"
echo "Allocated Storage: ${ALLOCATED_STORAGE}GB"
echo ""

echo "Creating alarms:"

# 1. CPU Utilization Alarm (> 80%)
create_alarm \
  "${RDS_INSTANCE}-HighCPU" \
  "CPUUtilization" \
  "80" \
  "GreaterThanThreshold" \
  "RDS CPU utilization is above 80%" \
  "Percent"

# 2. Database Connections Alarm (> 80% of max)
# For db.t3.micro, max_connections is typically around 66
MAX_CONNECTIONS=66
CONNECTION_THRESHOLD=$((MAX_CONNECTIONS * 80 / 100))
create_alarm \
  "${RDS_INSTANCE}-HighConnections" \
  "DatabaseConnections" \
  "$CONNECTION_THRESHOLD" \
  "GreaterThanThreshold" \
  "RDS connection count is above 80% of maximum ($CONNECTION_THRESHOLD/$MAX_CONNECTIONS)" \
  "Count"

# 3. Free Storage Space Alarm (< 10% of allocated)
# Convert to bytes (GB * 1024 * 1024 * 1024)
FREE_STORAGE_THRESHOLD=$((ALLOCATED_STORAGE * 1073741824 / 10))  # 10% of allocated storage in bytes
create_alarm \
  "${RDS_INSTANCE}-LowFreeStorage" \
  "FreeStorageSpace" \
  "$FREE_STORAGE_THRESHOLD" \
  "LessThanThreshold" \
  "RDS free storage is below 10% (${ALLOCATED_STORAGE}GB allocated)" \
  "Bytes"

# 4. Read Latency Alarm (> 200ms)
create_alarm \
  "${RDS_INSTANCE}-HighReadLatency" \
  "ReadLatency" \
  "0.2" \
  "GreaterThanThreshold" \
  "RDS read latency is above 200ms" \
  "Seconds"

# 5. Write Latency Alarm (> 200ms)
create_alarm \
  "${RDS_INSTANCE}-HighWriteLatency" \
  "WriteLatency" \
  "0.2" \
  "GreaterThanThreshold" \
  "RDS write latency is above 200ms" \
  "Seconds"

# 6. Burst Balance Alarm for T3 instances (< 20%)
if [[ $INSTANCE_CLASS == db.t3.* ]]; then
  create_alarm \
    "${RDS_INSTANCE}-LowBurstBalance" \
    "BurstBalance" \
    "20" \
    "LessThanThreshold" \
    "RDS burst balance is below 20% (T3 instance)" \
    "Percent"
fi

echo ""
echo "3. CREATING S3 ALARMS"
echo "====================="

S3_BUCKET="ots-erp-prod-uploads"
echo "Creating alarms for bucket: $S3_BUCKET"

# S3 alarms use different namespace
create_s3_alarm() {
  local ALARM_NAME=$1
  local METRIC_NAME=$2
  local THRESHOLD=$3
  local COMPARISON=$4
  local DESCRIPTION=$5
  
  echo -n "  Creating $ALARM_NAME... "
  
  aws cloudwatch put-metric-alarm \
    --alarm-name "$ALARM_NAME" \
    --alarm-description "$DESCRIPTION" \
    --metric-name "$METRIC_NAME" \
    --namespace "AWS/S3" \
    --statistic "Average" \
    --period 86400 \
    --threshold $THRESHOLD \
    --comparison-operator "$COMPARISON" \
    --evaluation-periods 1 \
    --dimensions Name=BucketName,Value=$S3_BUCKET Name=StorageType,Value=StandardStorage \
    --alarm-actions "$SNS_TOPIC_ARN" \
    --treat-missing-data notBreaching \
    --region $REGION 2>/dev/null
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${YELLOW}⚠ May need to wait for metrics${NC}"
  fi
}

# S3 Bucket Size Alarm (> 50GB)
create_s3_alarm \
  "${S3_BUCKET}-HighStorage" \
  "BucketSizeBytes" \
  "53687091200" \
  "GreaterThanThreshold" \
  "S3 bucket size is above 50GB"

echo ""
echo "4. VERIFYING ALARMS"
echo "==================="

# List all alarms we created
echo "Checking alarm states:"
ALARMS=$(aws cloudwatch describe-alarms \
  --alarm-name-prefix "${RDS_INSTANCE}-" \
  --region $REGION 2>/dev/null)

if [ $? -eq 0 ]; then
  echo "$ALARMS" | jq -r '.MetricAlarms[] | "  • \(.AlarmName): \(.StateValue)"' | while read line; do
    if [[ $line == *"OK"* ]]; then
      echo -e "  ${GREEN}${line}${NC}"
    elif [[ $line == *"ALARM"* ]]; then
      echo -e "  ${RED}${line}${NC}"
    else
      echo -e "  ${YELLOW}${line}${NC}"
    fi
  done
else
  echo -e "${RED}Failed to list alarms${NC}"
fi

echo ""
echo "5. ALARM DASHBOARD"
echo "=================="

# Create CloudWatch dashboard
DASHBOARD_NAME="OTS-ERP-Monitoring"
echo -n "Creating CloudWatch dashboard: $DASHBOARD_NAME... "

DASHBOARD_BODY=$(cat <<EOF
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/RDS", "CPUUtilization", {"stat": "Average", "label": "CPU %"}],
          [".", "DatabaseConnections", {"stat": "Average", "yAxis": "right", "label": "Connections"}]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "$REGION",
        "title": "RDS Performance",
        "period": 300,
        "dimensions": {
          "DBInstanceIdentifier": "$RDS_INSTANCE"
        }
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/RDS", "FreeStorageSpace", {"stat": "Average"}],
          [".", "BurstBalance", {"stat": "Average", "yAxis": "right"}]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "$REGION",
        "title": "RDS Storage & Burst",
        "period": 300,
        "dimensions": {
          "DBInstanceIdentifier": "$RDS_INSTANCE"
        }
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/RDS", "ReadLatency", {"stat": "Average"}],
          [".", "WriteLatency", {"stat": "Average"}]
        ],
        "view": "timeSeries",
        "stacked": false,
        "region": "$REGION",
        "title": "RDS Latency",
        "period": 300,
        "dimensions": {
          "DBInstanceIdentifier": "$RDS_INSTANCE"
        }
      }
    }
  ]
}
EOF
)

aws cloudwatch put-dashboard \
  --dashboard-name "$DASHBOARD_NAME" \
  --dashboard-body "$DASHBOARD_BODY" \
  --region $REGION 2>/dev/null

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC}"
  echo "  View at: https://console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=$DASHBOARD_NAME"
else
  echo -e "${YELLOW}⚠ Dashboard creation failed${NC}"
fi

echo ""
echo "============================================"
echo "=== ALARM SETUP COMPLETE ==="
echo "============================================"
echo ""
echo -e "${GREEN}✓ SNS topic configured${NC}"
echo -e "${GREEN}✓ RDS alarms created${NC}"
echo -e "${GREEN}✓ Monitoring dashboard created${NC}"
echo ""
echo "Next steps:"
echo "  1. Confirm SNS email subscription (check $EMAIL_ADDRESS)"
echo "  2. Review alarm thresholds based on your workload"
echo "  3. Monitor dashboard for baseline metrics"
echo ""
echo "Alarm console: https://console.aws.amazon.com/cloudwatch/home?region=$REGION#alarmsV2:"
echo ""
echo "Setup complete at $(date '+%Y-%m-%d %H:%M:%S')"