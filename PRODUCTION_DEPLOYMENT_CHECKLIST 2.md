# Production Deployment Checklist

## Pre-Deployment Steps

### 1. Database Migration (RDS)
- [ ] Run migration to add PENDING_REVIEW status to JobStatus enum
```sql
-- Run this on RDS production database
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'PENDING_REVIEW'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'JobStatus')
    ) THEN
        ALTER TYPE "JobStatus" ADD VALUE 'PENDING_REVIEW' AFTER 'IN_PROGRESS';
    END IF;
END $$;
```

### 2. Environment Variables
Ensure these are set in your production environment:
- [ ] `DATABASE_URL` - RDS connection string
- [ ] `JWT_SECRET` - For authentication
- [ ] `AWS_S3_BUCKET` - Set to "ots-erp-prod-uploads"
- [ ] `AWS_S3_REGION` - Set to "us-east-2"
- [ ] `AWS_ACCESS_KEY_ID` - For S3 access (if not using IAM role)
- [ ] `AWS_SECRET_ACCESS_KEY` - For S3 access (if not using IAM role)
- [ ] `NODE_ENV` - Set to "production"

### 3. S3 Bucket Configuration
- [ ] Verify S3 bucket "ots-erp-prod-uploads" exists
- [ ] Ensure proper IAM permissions for ECS task role
- [ ] Verify CORS configuration if needed

### 4. Build and Test
- [ ] Run `npm run build` locally to ensure no build errors
- [ ] Test all critical paths locally:
  - [ ] Employee marking job as done
  - [ ] Admin approving jobs
  - [ ] File uploads (will use S3 in production)
  - [ ] Time entry creation
  - [ ] Materials page loading

## Deployment Steps

### 1. Docker Image
- [ ] Build new Docker image with latest code
- [ ] Tag with appropriate version
- [ ] Push to ECR repository

### 2. ECS Service Update
- [ ] Update ECS task definition with new image
- [ ] Deploy using rolling update strategy
- [ ] Monitor deployment progress in ECS console

### 3. Post-Deployment Verification
- [ ] Check ECS service is healthy
- [ ] Verify ALB health checks passing
- [ ] Test login functionality
- [ ] Test job completion workflow:
  - [ ] Employee can mark job done
  - [ ] Admin receives notification
  - [ ] Admin can approve job
- [ ] Verify file uploads work (S3)
- [ ] Check materials page loads without errors
- [ ] Monitor CloudWatch logs for any errors

## Rollback Plan
If issues are encountered:
1. Revert ECS service to previous task definition
2. If database changes need reverting, have rollback SQL ready
3. Keep previous Docker image tagged for quick rollback

## Notes
- The storage adapter will automatically use S3 in production (based on NODE_ENV)
- Notifications are now real-time from database
- Dashboard cards preferences are stored in localStorage per user
- PENDING_REVIEW status is critical for job workflow

## Key Changes in This Release
1. Two-stage job completion workflow
2. Real-time notifications from database
3. S3 file storage integration
4. Customizable dashboard
5. Enhanced time entry with job suggestions
6. Crew availability management
7. Materials API fixes

## Support Contacts
- Database issues: Check RDS logs in CloudWatch
- S3 issues: Check S3 bucket permissions and IAM role
- ECS/Container issues: Check ECS task logs in CloudWatch
- Application errors: Check application logs in CloudWatch Logs

Last Updated: $(date)