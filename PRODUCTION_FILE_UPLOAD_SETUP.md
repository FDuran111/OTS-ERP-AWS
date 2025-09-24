# Production File Upload Setup Guide

## Prerequisites Checklist

### 1. Database Migration (RDS)
**⚠️ CRITICAL: Must be run before deployment**

Since RDS is behind VPC, you have several options:
- **Option A**: Use AWS Systems Manager Session Manager to connect to an EC2 instance in the same VPC
- **Option B**: Use AWS RDS Query Editor in the console
- **Option C**: Create a temporary bastion host
- **Option D**: Use an ECS task to run the migration

Run the migration script: `migrations/add_file_upload_table.sql`

### 2. S3 Bucket Setup
The bucket `ots-erp-prod-uploads` already exists. You need to:

#### a) Update Bucket Policy
```bash
aws s3api put-bucket-policy \
  --bucket ots-erp-prod-uploads \
  --policy file://aws/s3-bucket-policy.json
```

#### b) Set CORS Configuration
```bash
aws s3api put-bucket-cors \
  --bucket ots-erp-prod-uploads \
  --cors-configuration file://aws/s3-cors-config.json
```

#### c) Verify bucket structure
The app will automatically create this structure:
```
ots-erp-prod-uploads/
├── jobs/
│   ├── {jobId}/
│   │   ├── photo/
│   │   ├── document/
│   │   ├── invoice/
│   │   └── attachment/
```

### 3. IAM Role Permissions
Check that your ECS task role has these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::ots-erp-prod-uploads/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::ots-erp-prod-uploads"
    }
  ]
}
```

### 4. Environment Variables in ECS Task Definition
Verify these are set:
- `AWS_S3_BUCKET=ots-erp-prod-uploads`
- `AWS_S3_REGION=us-east-2`
- `NODE_ENV=production`
- `DATABASE_URL` (should point to RDS)

### 5. Quick Test Commands

#### Test S3 Access from ECS
```bash
# SSH into ECS container (if exec is enabled)
aws ecs execute-command \
  --cluster ots-erp-cluster \
  --task <task-id> \
  --container ots-erp-container \
  --interactive \
  --command "/bin/sh"

# Test S3 access
aws s3 ls s3://ots-erp-prod-uploads/
```

#### Check if FileUpload table exists in RDS
Use AWS RDS Query Editor:
```sql
SELECT * FROM information_schema.tables
WHERE table_name = 'FileUpload';
```

## Potential Issues and Solutions

### Issue 1: "Table FileUpload does not exist"
**Solution**: Run the migration script on RDS

### Issue 2: "Access Denied" S3 errors
**Solution**: Check IAM role permissions and bucket policy

### Issue 3: "CORS error" when uploading
**Solution**: Update S3 CORS configuration

### Issue 4: Files upload but don't display
**Solution**: Check presigned URL generation and expiry time

### Issue 5: "Category constraint violation"
**Solution**: Already fixed in code - using singular forms (photo, document, etc.)

## Deployment Steps

1. **Run RDS Migration** (MUST do first!)
2. **Update S3 bucket policy and CORS**
3. **Deploy new Docker image** (already built and pushed)
4. **Update ECS service** (force new deployment)
5. **Test file upload on production**

## Testing Checklist
- [ ] Upload a photo (JPEG/PNG)
- [ ] Upload a document (PDF)
- [ ] View uploaded files
- [ ] Download a file
- [ ] Delete a file (if implemented)
- [ ] Check files persist after container restart