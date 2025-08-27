# Deployment Notes - Coolify to AWS Migration

## Current Coolify/Docker Configuration

### Dockerfile Analysis
- **Base Image**: `node:20-alpine`
- **Build Type**: Multi-stage build
  - Stage 1: Dependencies installation
  - Stage 2: Application build
  - Stage 3: Production runtime
- **Output Type**: `standalone` (configured in next.config.ts)
- **User**: Runs as non-root user `nextjs` (uid 1001)
- **Port**: 3000 (exposed and configured)
- **Healthcheck**: 
  - Script: `healthcheck.js`
  - Interval: 30s
  - Timeout: 3s
  - Retries: 3

### Runtime Configuration
- **Process Manager**: Direct node execution (`node server.js`)
- **Environment**: Production mode with telemetry disabled
- **Cache Directory**: `.next` with proper permissions
- **Static Files**: Copied from build stage
- **Public Files**: Copied to runtime container

### Environment Variables in Production
Current production uses these critical variables:
- `DATABASE_URL` - PostgreSQL connection (currently Supabase)
- `JWT_SECRET` - Authentication
- `SUPABASE_*` - Storage configuration (to be replaced)
- `NODE_ENV=production`
- `PORT=3000`

### Volume Mounts
- No persistent volumes required
- All uploads currently go to Supabase Storage (will change to S3)

## AWS Migration Requirements

### For AWS Amplify
1. **Build Settings**: Already configured for standalone output ✅
2. **Port**: Default 3000 works with Amplify ✅
3. **Health Check**: `/api/health` endpoint needed (check if exists)
4. **Environment Variables**: Must not use `AWS_` prefix
5. **Build Commands**:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
   ```

### For ECS/Fargate
1. **Container Image**: Current Dockerfile is ECS-ready ✅
2. **Task Definition** needs:
   - CPU: 512 (0.5 vCPU) minimum
   - Memory: 1024 MB minimum
   - Port mapping: 3000
3. **Health Check**: HTTP check on `/` or `/api/health`
4. **Logging**: Configure CloudWatch logs driver
5. **Secrets**: Use AWS Secrets Manager for sensitive env vars

### For EC2 Deployment
1. **Process Manager**: Consider PM2 for production
2. **Reverse Proxy**: Nginx or ALB for SSL termination
3. **Auto-scaling**: Configure based on CPU/memory metrics
4. **Monitoring**: CloudWatch agent for custom metrics

## Required Adjustments for AWS

### Code Changes
1. **Storage Provider**: Switch from Supabase to S3
   - Update `src/lib/supabase-storage.ts` → create S3 equivalent
   - Update file upload handlers

2. **Database Connection**: 
   - Already using standard PostgreSQL (pg library) ✅
   - Just update DATABASE_URL to RDS endpoint

3. **Health Check Endpoint**: Verify `/api/health` exists and returns:
   ```json
   {
     "status": "healthy",
     "timestamp": "2024-01-20T10:00:00Z",
     "version": "1.0.0",
     "services": {
       "database": "connected",
       "storage": "s3"
     }
   }
   ```

### Environment Variable Mapping
| Coolify Variable | AWS Variable |
|-----------------|--------------|
| DATABASE_URL (Supabase) | DATABASE_URL (RDS) |
| SUPABASE_SERVICE_ROLE_KEY | (Remove) |
| NEXT_PUBLIC_SUPABASE_URL | (Remove) |
| (None) | S3_BUCKET |
| (None) | S3_REGION |
| (None) | STORAGE_DRIVER=s3 |

### Deployment Pipeline
1. **Build Stage**: 
   - Use GitHub Actions or AWS CodeBuild
   - Build Docker image
   - Run tests

2. **Push Stage**:
   - Push to ECR (Elastic Container Registry)
   - Tag with commit SHA and environment

3. **Deploy Stage**:
   - Update ECS service or Amplify app
   - Run database migrations if needed
   - Verify health checks pass

### Security Considerations
1. **Secrets Management**: 
   - Move from Coolify env vars to AWS Secrets Manager
   - Rotate credentials regularly

2. **Network Security**:
   - Place RDS in private subnet
   - Use security groups to restrict access
   - Enable VPC endpoints for S3

3. **IAM Roles**:
   - Task execution role for ECS
   - Task role with S3 permissions
   - No hardcoded AWS credentials

## Migration Checklist

- [ ] Update storage service to use S3
- [ ] Update DATABASE_URL to RDS endpoint
- [ ] Remove all Supabase environment variables
- [ ] Add AWS-specific environment variables
- [ ] Test health check endpoint
- [ ] Configure AWS Secrets Manager
- [ ] Set up ECR repository
- [ ] Create ECS task definition or Amplify app
- [ ] Configure CloudWatch logging
- [ ] Set up monitoring and alerts
- [ ] Test file uploads with S3
- [ ] Verify database connectivity
- [ ] Run smoke tests
- [ ] Configure auto-scaling (if using ECS)
- [ ] Set up backup strategy