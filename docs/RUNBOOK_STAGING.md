# Staging Environment Runbook

## Overview
This runbook provides operational procedures for the OTS-ARP-AWS staging environment, including deployment, monitoring, troubleshooting, and cost management.

## Table of Contents
1. [Environment Overview](#environment-overview)
2. [Deployment Procedures](#deployment-procedures)
3. [Health Monitoring](#health-monitoring)
4. [Billing Checks](#billing-checks)
5. [Troubleshooting](#troubleshooting)
6. [Emergency Procedures](#emergency-procedures)

## Environment Overview

### Infrastructure
- **Region**: us-east-2 (Ohio)
- **Hosting**: AWS Amplify
- **Database**: RDS PostgreSQL (NAT-free architecture)
- **Storage**: S3
- **Secrets**: AWS Secrets Manager
- **Budget**: $35/month

### Key Components
- No NAT gateways (cost optimization)
- VPC Lambda for database migrations
- Basic authentication for staging protection
- Automated smoke tests
- Uptime monitoring (every 10 minutes)

## Deployment Procedures

### Automatic Deployment
Deployments trigger automatically on push to `main` branch:
1. GitHub Actions workflow starts
2. Database migrations run via Lambda
3. Amplify builds and deploys
4. Smoke tests verify deployment
5. Uptime monitoring resumes

### Manual Deployment
```bash
# Trigger deployment workflow
gh workflow run deploy-staging.yml

# Or push to main
git push origin main
```

### Rollback
```bash
# Revert to previous Amplify deployment
aws amplify list-branches --app-id <app-id>
aws amplify start-deployment --app-id <app-id> --branch-name main --job-id <previous-job-id>
```

## Health Monitoring

### Uptime Check
Automated health checks run every 10 minutes:
- **Endpoint**: `/api/health`
- **Workflow**: `.github/workflows/uptime-check.yml`
- **Alerts**: GitHub Issues after 3 failures

### Manual Health Check
```bash
# Local script
./scripts/uptime-local.sh --aws

# Direct curl
curl -u staging:password https://staging.amplifyapp.com/api/health
```

### Smoke Tests
Run comprehensive tests:
```bash
# Automatic detection
node scripts/smoke-staging.mjs

# Manual configuration
STAGING_BASE_URL=https://staging.amplifyapp.com \
STAGING_BASIC_AUTH=user:pass \
node scripts/smoke-staging.mjs
```

## Billing Checks

### Overview
Monitor and control staging costs to stay within $35/month budget.

### Running Billing Checks

#### Local Execution
```bash
# Basic check (auto-detect VPC)
AWS_REGION=us-east-2 ./scripts/check-billing-signals.sh

# With specific VPC
AWS_REGION=us-east-2 \
VPC_ID=vpc-12345678 \
./scripts/check-billing-signals.sh
```

#### GitHub Workflow
1. Go to [Actions](https://github.com/[org]/[repo]/actions)
2. Select "Billing Check" workflow
3. Click "Run workflow"
4. Optional: Specify VPC ID
5. View results in workflow summary

#### Scheduled Checks
- Runs weekly on Mondays at 9 AM UTC
- Saves JSON report as artifact
- Posts summary to workflow run

### Understanding Output

#### Typical Monthly Costs
Expected costs for staging environment:
- **Amplify**: $5-10 (hosting, builds)
- **RDS**: $15-20 (db.t3.micro)
- **S3**: $1-3 (storage, transfers)
- **Secrets Manager**: $2-4 (secrets storage)
- **CloudWatch**: $2-5 (logs, metrics)
- **Total**: ~$25-35/month

#### NAT Gateway Check
```
=========================================
   🔍 NAT Gateway Check
=========================================

✅ No NAT gateways found (saving ~$45/month)
```

If NAT gateways are found:
```
❌ NAT gateways found: nat-0abc123def456789
⚠️  Each NAT gateway costs ~$45/month!
```

#### Cost Breakdown
```
Top 5 Services by Cost:
------------------------
AWS Amplify                    | $7.23
Amazon RDS                     | $18.45
Amazon S3                      | $2.11
AWS Secrets Manager            | $3.50
CloudWatch                     | $1.89
------------------------
Total MTD: $33.18

✅ Projected month-end: $34.50 (within budget)
```

### Cost Alerts

#### Budget Configuration
Terraform creates AWS Budget with alerts:
- **80% threshold** ($28): Warning email
- **100% threshold** ($35): Critical email
- **Forecast alert**: Trending to exceed

#### Setting Alert Emails
Update `infra/terraform/envs/staging/terraform.tfvars`:
```hcl
budget_alert_emails = [
  "admin@example.com",
  "devops@example.com"
]
```

Apply changes:
```bash
cd infra/terraform/envs/staging
terraform apply
```

### Cost Optimization

#### Quick Wins
1. **Remove NAT Gateways** (saves $45/month each)
2. **Stop unused RDS instances**
3. **Clean S3 buckets** of old test data
4. **Reduce CloudWatch log retention**
5. **Optimize Amplify build frequency**

#### NAT Gateway Removal
If NAT gateways are detected:
```bash
# List NAT gateways
aws ec2 describe-nat-gateways --filter Name=vpc-id,Values=<vpc-id>

# Delete NAT gateway
aws ec2 delete-nat-gateway --nat-gateway-id <nat-id>

# Update route tables to remove NAT routes
aws ec2 describe-route-tables --filter Name=vpc-id,Values=<vpc-id>
aws ec2 delete-route --route-table-id <rtb-id> --destination-cidr-block 0.0.0.0/0
```

## Troubleshooting

### Common Issues

#### High Costs
1. Run billing check: `./scripts/check-billing-signals.sh`
2. Check for NAT gateways
3. Review RDS instance size
4. Check S3 bucket sizes
5. Review CloudWatch log groups

#### Health Check Failures
1. Check Amplify deployment status
2. Review CloudWatch logs
3. Verify RDS is accessible
4. Check security groups
5. Review recent commits

#### Database Connection Issues
1. Verify RDS is running
2. Check VPC Lambda connectivity
3. Review security group rules
4. Check RDS credentials in Secrets Manager

### Log Locations
- **Application Logs**: CloudWatch → Log groups → `/aws/amplify/ots-arp-aws-staging`
- **Lambda Logs**: CloudWatch → Log groups → `/aws/lambda/ots-arp-aws-staging-migrate`
- **RDS Logs**: RDS Console → Staging instance → Logs & events

## Emergency Procedures

### Service Outage
1. Check [AWS Status](https://status.aws.amazon.com/)
2. Run health check: `./scripts/uptime-local.sh --aws`
3. Check Amplify Console for deployment status
4. Review CloudWatch alarms
5. Check GitHub Issues for automated alerts

### Budget Exceeded
1. Run billing check immediately
2. Identify high-cost services
3. Stop non-critical resources:
   ```bash
   # Stop RDS if not needed
   aws rds stop-db-instance --db-instance-identifier staging-db
   
   # Delete old S3 objects
   aws s3 rm s3://bucket/test/ --recursive
   ```
4. Review and remove NAT gateways
5. Update budget alerts if needed

### Rollback Procedures
1. **Application Rollback**:
   ```bash
   # List recent deployments
   aws amplify list-jobs --app-id <app-id> --branch-name main
   
   # Redeploy previous version
   aws amplify start-deployment --app-id <app-id> --branch-name main --job-id <job-id>
   ```

2. **Database Rollback**:
   ```bash
   # Restore from snapshot
   aws rds restore-db-instance-from-db-snapshot \
     --db-instance-identifier staging-db-restored \
     --db-snapshot-identifier <snapshot-id>
   ```

3. **Infrastructure Rollback**:
   ```bash
   cd infra/terraform/envs/staging
   terraform plan
   terraform apply  # Review changes carefully
   ```

## Maintenance Windows

### Scheduled Maintenance
- **RDS Maintenance**: Sundays 06:00-08:00 UTC
- **Amplify Updates**: Automatic, no downtime
- **Lambda Updates**: Deploy during low traffic

### Pre-Maintenance Checklist
1. Notify team via Slack
2. Run smoke tests to establish baseline
3. Take RDS snapshot
4. Verify backup procedures

### Post-Maintenance Verification
1. Run health check
2. Execute smoke tests
3. Verify billing not impacted
4. Update documentation if needed

## Contact Information

### Escalation Path
1. **Level 1**: Check automated monitoring (GitHub Issues)
2. **Level 2**: DevOps team via Slack
3. **Level 3**: On-call engineer via PagerDuty
4. **Level 4**: AWS Support (if AWS issue)

### Key Personnel
- **DevOps Lead**: [Name] - [Email]
- **Platform Engineer**: [Name] - [Email]
- **AWS Account Owner**: [Name] - [Email]

## Related Documentation
- [Smoke Tests](./SMOKE_TESTS.md)
- [AWS Services Lock](./AWS_SERVICES_LOCK.md)
- [Environment Variables](./ENV_VARS.md)
- [Staging Isolation](./STAGING_ISOLATION.md)