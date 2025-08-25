#!/bin/bash

# Billing signals check script for staging environment
# Verifies no NAT gateways and shows top cost drivers

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-us-east-2}"
VPC_ID="${VPC_ID:-}"
EXIT_CODE=0

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "success")
            echo -e "${GREEN}✅ ${message}${NC}"
            ;;
        "error")
            echo -e "${RED}❌ ${message}${NC}"
            ;;
        "warning")
            echo -e "${YELLOW}⚠️  ${message}${NC}"
            ;;
        "info")
            echo -e "${BLUE}ℹ️  ${message}${NC}"
            ;;
        *)
            echo "$message"
            ;;
    esac
}

# Header
echo "========================================="
echo "   💰 Billing Signals Check"
echo "========================================="
echo ""
echo "Environment: Staging"
echo "AWS Region: $AWS_REGION"
echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Check for AWS CLI
if ! command -v aws &> /dev/null; then
    print_status "error" "AWS CLI not found. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_status "error" "AWS credentials not configured or expired."
    exit 1
fi

echo "========================================="
echo "   🔍 NAT Gateway Check"
echo "========================================="
echo ""

# If VPC_ID not provided, try to find it
if [ -z "$VPC_ID" ]; then
    print_status "info" "VPC_ID not provided, searching for staging VPC..."
    
    # Try to find VPC by tag
    VPC_ID=$(aws ec2 describe-vpcs \
        --filters "Name=tag:Environment,Values=staging" "Name=tag:Name,Values=*staging*" \
        --query "Vpcs[0].VpcId" \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "None" ]; then
        print_status "warning" "Could not auto-detect staging VPC. Checking all NAT gateways..."
        VPC_FILTER=""
    else
        print_status "success" "Found staging VPC: $VPC_ID"
        VPC_FILTER="Name=vpc-id,Values=$VPC_ID"
    fi
else
    VPC_FILTER="Name=vpc-id,Values=$VPC_ID"
fi

# Check for NAT gateways
if [ -n "$VPC_FILTER" ]; then
    NAT_GATEWAYS=$(aws ec2 describe-nat-gateways \
        --filter "$VPC_FILTER" "Name=state,Values=available,pending,deleting" \
        --query "NatGateways[].NatGatewayId" \
        --output text 2>/dev/null || echo "")
else
    NAT_GATEWAYS=$(aws ec2 describe-nat-gateways \
        --filter "Name=state,Values=available,pending,deleting" \
        --query "NatGateways[].NatGatewayId" \
        --output text 2>/dev/null || echo "")
fi

if [ -z "$NAT_GATEWAYS" ]; then
    print_status "success" "No NAT gateways found (saving ~$45/month)"
else
    print_status "error" "NAT gateways found: $NAT_GATEWAYS"
    print_status "warning" "Each NAT gateway costs ~$45/month!"
    print_status "warning" "Consider removing NAT gateways for staging to reduce costs"
    EXIT_CODE=1
    
    # Show more details about the NAT gateways
    echo ""
    echo "NAT Gateway Details:"
    aws ec2 describe-nat-gateways \
        --nat-gateway-ids $NAT_GATEWAYS \
        --query "NatGateways[].{ID:NatGatewayId,State:State,VPC:VpcId,Created:CreateTime}" \
        --output table
fi

echo ""
echo "========================================="
echo "   📊 Cost Analysis (Month-to-Date)"
echo "========================================="
echo ""

# Calculate date range for current month
START_DATE=$(date -u +"%Y-%m-01")
END_DATE=$(date -u +"%Y-%m-%d")
TOMORROW=$(date -u -d "+1 day" +"%Y-%m-%d")

print_status "info" "Analyzing costs from $START_DATE to $END_DATE"
echo ""

# Get cost data from Cost Explorer
COST_DATA=$(aws ce get-cost-and-usage \
    --time-period Start=$START_DATE,End=$TOMORROW \
    --granularity MONTHLY \
    --metrics "UnblendedCost" \
    --group-by Type=DIMENSION,Key=SERVICE \
    --query "ResultsByTime[0].Groups" \
    --output json 2>/dev/null || echo "[]")

if [ "$COST_DATA" = "[]" ]; then
    print_status "warning" "No cost data available for current month"
else
    # Parse and display top services
    echo "Top 5 Services by Cost:"
    echo "------------------------"
    
    # Extract and sort services by cost
    echo "$COST_DATA" | jq -r '
        sort_by(-.Metrics.UnblendedCost.Amount | tonumber) | 
        .[0:5] | 
        .[] | 
        "\(.Keys[0]) | $\(.Metrics.UnblendedCost.Amount | tonumber | . * 100 | round / 100)"
    ' | column -t -s '|' | while IFS= read -r line; do
        SERVICE=$(echo "$line" | awk '{print $1, $2}')
        COST=$(echo "$line" | awk '{print $3}')
        
        # Highlight key services
        case "$SERVICE" in
            *"Amplify"*)
                echo -e "${BLUE}$SERVICE${NC} | $COST"
                ;;
            *"RDS"* | *"Relational Database Service"*)
                echo -e "${BLUE}$SERVICE${NC} | $COST"
                ;;
            *"S3"* | *"Simple Storage Service"*)
                echo -e "${BLUE}$SERVICE${NC} | $COST"
                ;;
            *"Secrets Manager"*)
                echo -e "${BLUE}$SERVICE${NC} | $COST"
                ;;
            *"CloudWatch"*)
                echo -e "${BLUE}$SERVICE${NC} | $COST"
                ;;
            *"NAT Gateway"* | *"EC2-Other"*)
                echo -e "${RED}$SERVICE${NC} | $COST"
                ;;
            *)
                echo "$SERVICE | $COST"
                ;;
        esac
    done
    
    echo ""
    
    # Calculate total
    TOTAL_COST=$(echo "$COST_DATA" | jq -r '
        [.[] | .Metrics.UnblendedCost.Amount | tonumber] | 
        add | 
        . * 100 | round / 100
    ')
    
    echo "------------------------"
    echo -e "${YELLOW}Total MTD: \$$TOTAL_COST${NC}"
    
    # Check if on track for budget
    DAY_OF_MONTH=$(date +%d)
    DAYS_IN_MONTH=$(date -d "$START_DATE +1 month -1 day" +%d)
    PROJECTED_COST=$(echo "scale=2; $TOTAL_COST * $DAYS_IN_MONTH / $DAY_OF_MONTH" | bc 2>/dev/null || echo "0")
    
    echo ""
    print_status "info" "Day $DAY_OF_MONTH of $DAYS_IN_MONTH"
    
    if (( $(echo "$PROJECTED_COST > 35" | bc -l) )); then
        print_status "warning" "Projected month-end: \$$PROJECTED_COST (over budget!)"
    else
        print_status "success" "Projected month-end: \$$PROJECTED_COST (within budget)"
    fi
fi

echo ""
echo "========================================="
echo "   🎯 Target Services Breakdown"
echo "========================================="
echo ""

# Get detailed costs for specific services
SERVICES=("AWS Amplify" "Amazon Relational Database Service" "Amazon Simple Storage Service" "AWS Secrets Manager" "CloudWatch")

for SERVICE in "${SERVICES[@]}"; do
    SERVICE_COST=$(echo "$COST_DATA" | jq -r --arg svc "$SERVICE" '
        .[] | select(.Keys[0] == $svc) | 
        .Metrics.UnblendedCost.Amount | 
        tonumber | . * 100 | round / 100
    ' 2>/dev/null || echo "0")
    
    if [ -n "$SERVICE_COST" ] && [ "$SERVICE_COST" != "0" ]; then
        # Simplify service names for display
        DISPLAY_NAME="$SERVICE"
        case "$SERVICE" in
            "AWS Amplify")
                DISPLAY_NAME="Amplify (hosting)"
                ;;
            "Amazon Relational Database Service")
                DISPLAY_NAME="RDS (database)"
                ;;
            "Amazon Simple Storage Service")
                DISPLAY_NAME="S3 (storage)"
                ;;
            "AWS Secrets Manager")
                DISPLAY_NAME="Secrets Manager"
                ;;
            "CloudWatch")
                DISPLAY_NAME="CloudWatch (logs)"
                ;;
        esac
        
        printf "%-25s: \$%s\n" "$DISPLAY_NAME" "$SERVICE_COST"
    fi
done

echo ""
echo "========================================="
echo "   📋 Summary"
echo "========================================="
echo ""

# Final summary
if [ $EXIT_CODE -eq 0 ]; then
    print_status "success" "All billing checks passed!"
    echo ""
    echo "✅ No NAT gateways (good!)"
    echo "✅ Costs are being tracked"
    
    if [ -n "$TOTAL_COST" ]; then
        if (( $(echo "$TOTAL_COST < 35" | bc -l) )); then
            echo "✅ Within budget limit (\$$TOTAL_COST < \$35)"
        else
            echo "⚠️  Approaching/over budget (\$$TOTAL_COST)"
        fi
    fi
else
    print_status "error" "Billing issues detected!"
    echo ""
    echo "❌ NAT gateways found - costing ~\$45/month each"
    echo ""
    echo "Recommended actions:"
    echo "1. Remove NAT gateways from staging VPC"
    echo "2. Use VPC endpoints or Lambda in VPC for private resources"
    echo "3. Review terraform configuration for NAT gateway resources"
fi

echo ""
echo "========================================="
echo ""

# Save detailed output as JSON for CI artifact
if [ -n "$GITHUB_ACTIONS" ]; then
    OUTPUT_FILE="billing-signals-$(date +%Y%m%d-%H%M%S).json"
    
    # Create detailed JSON report
    cat > "$OUTPUT_FILE" << EOF
{
  "timestamp": "$(date -u -Iseconds)",
  "environment": "staging",
  "region": "$AWS_REGION",
  "vpc_id": "$VPC_ID",
  "nat_gateways": $([ -z "$NAT_GATEWAYS" ] && echo "[]" || echo "[\"$NAT_GATEWAYS\"]"),
  "total_cost_mtd": ${TOTAL_COST:-0},
  "projected_month_end": ${PROJECTED_COST:-0},
  "budget_limit": 35,
  "status": $([ $EXIT_CODE -eq 0 ] && echo "\"pass\"" || echo "\"fail\"")
}
EOF
    
    print_status "info" "Detailed report saved to: $OUTPUT_FILE"
fi

exit $EXIT_CODE