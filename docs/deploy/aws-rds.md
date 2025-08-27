# AWS RDS Infrastructure Setup

## What This Creates

This step provisions the following AWS resources for the database tier:

1. **RDS PostgreSQL Instance**
   - Engine: PostgreSQL 16.3
   - Instance class: db.t4g.medium (configurable)
   - Storage: 50GB (configurable)
   - Database name: ortmeier
   - Username: otsapp
   - SSL/TLS enforced

2. **RDS Parameter Group**
   - Custom parameters for PostgreSQL 16
   - SSL enforcement enabled

3. **RDS Subnet Group**
   - Spans multiple availability zones
   - Private subnets only

4. **Security Group**
   - Controls network access to RDS
   - Restrictive by default

5. **RDS Proxy**
   - Connection pooling for better performance
   - Automatic failover support
   - TLS required
   - Idle timeout: 30 minutes

## How to Run

### 1. Review the Plan

```bash
npm run infra:plan
```

Review the RDS resources that will be created.

### 2. Apply the Configuration

```bash
npm run infra:apply
```

This creates the RDS instance and proxy. Note that RDS creation can take 10-15 minutes.

## Validation

### Test RDS Connection

After the RDS instance is created and available:

```bash
./scripts/aws/validate-rds.sh <rds-proxy-endpoint> ortmeier otsapp
```

Example:
```bash
./scripts/aws/validate-rds.sh ots-erp-prod-proxy-endpoint.proxy-xyz.us-east-2.rds.amazonaws.com ortmeier otsapp
```

The script will:
1. Retrieve the password from Secrets Manager
2. Connect to RDS via the proxy endpoint
3. Execute a test query to verify connectivity

## Environment Variable Mapping

After RDS is deployed, update your application configuration:

```env
# Database Configuration
DB_DRIVER=RDS
RDS_PROXY_ENDPOINT=<terraform output rds_proxy_endpoint>
RDS_DB=ortmeier
RDS_USER=otsapp
RDS_PASSWORD=<from AWS Secrets Manager>
RDS_SSL_MODE=require
```

Example with actual values:
```env
DB_DRIVER=RDS
RDS_PROXY_ENDPOINT=ots-erp-prod-proxy-endpoint.proxy-xyz.us-east-2.rds.amazonaws.com
RDS_DB=ortmeier
RDS_USER=otsapp
# Password retrieved at runtime from Secrets Manager
RDS_SSL_MODE=require
```

## Database Migration

**Important**: This creates an empty database. Data migration from Supabase will be handled in a later step (Prompt 9).

## Performance Considerations

### RDS Proxy Benefits
- Connection pooling reduces database load
- Automatic failover for high availability
- IAM authentication support
- Reduced connection overhead

### Instance Sizing
Default: `db.t4g.medium`
- 2 vCPUs
- 4 GB RAM
- Up to 2,085 Mbps network

For production workloads, consider:
- `db.r6g.large` for memory-intensive workloads
- `db.m6g.large` for balanced compute/memory

### Storage
- Default: 50GB General Purpose SSD (gp3)
- Autoscaling can be enabled for production
- Consider provisioned IOPS for high-throughput applications

## Security Notes

1. **Network Isolation**: RDS is not publicly accessible
2. **SSL/TLS Required**: All connections must use SSL
3. **Password Management**: Password stored in Secrets Manager
4. **Security Groups**: Restrictive inbound rules
5. **RDS Proxy**: Additional security layer with IAM auth support

## Monitoring

After deployment, set up CloudWatch alarms for:
- CPU utilization > 80%
- Storage space < 10GB free
- Connection count > 80% of max
- Read/write latency thresholds

## Cost Optimization

Estimated monthly costs (us-east-2):
- RDS db.t4g.medium: ~$60/month
- RDS Proxy: ~$15/month
- Storage (50GB): ~$6/month
- Total: ~$81/month

To reduce costs:
1. Use Reserved Instances for predictable workloads (up to 72% savings)
2. Consider Aurora Serverless for variable workloads
3. Enable storage auto-scaling to avoid over-provisioning

## Troubleshooting

### Connection Timeout
- Check security group rules
- Verify subnet configuration
- Ensure RDS proxy is in "Available" state

### Authentication Failed
- Verify password in Secrets Manager
- Check username spelling
- Ensure SSL mode is set to "require"

### RDS Proxy Issues
- Check IAM role permissions
- Verify target group configuration
- Review proxy logs in CloudWatch

## Next Steps

1. **Prompt 8**: Configure database schema and initial data
2. **Prompt 9**: Migrate data from Supabase to RDS
3. **Prompt 10**: Switch application to use RDS
4. **Prompt 11**: Performance testing and optimization