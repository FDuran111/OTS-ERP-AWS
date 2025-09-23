# S3 Setup Guide for Ortmeier Job Management

## 1. Create S3 Bucket

```bash
# Create the S3 bucket
aws s3api create-bucket \
  --bucket ortmeier-job-files \
  --region us-east-2 \
  --create-bucket-configuration LocationConstraint=us-east-2

# Enable versioning for backup/recovery
aws s3api put-bucket-versioning \
  --bucket ortmeier-job-files \
  --versioning-configuration Status=Enabled

# Set up lifecycle policy to delete old versions after 30 days
aws s3api put-bucket-lifecycle-configuration \
  --bucket ortmeier-job-files \
  --lifecycle-configuration file://s3-lifecycle.json
```

## 2. Create IAM Policy for ECS Tasks

Create file `ecs-s3-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl",
        "s3:GetObjectAcl"
      ],
      "Resource": "arn:aws:s3:::ortmeier-job-files/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::ortmeier-job-files"
    }
  ]
}
```

Apply the policy:
```bash
# Create the policy
aws iam create-policy \
  --policy-name ortmeier-s3-access \
  --policy-document file://ecs-s3-policy.json

# Attach to your ECS task role (replace with your actual role name)
aws iam attach-role-policy \
  --role-name your-ecs-task-role \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/ortmeier-s3-access
```

## 3. S3 Bucket CORS Configuration

Create `s3-cors.json`:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-domain.com",
      "http://ots-erp-alb-1229912979.us-east-2.elb.amazonaws.com"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Apply CORS:
```bash
aws s3api put-bucket-cors \
  --bucket ortmeier-job-files \
  --cors-configuration file://s3-cors.json
```

## 4. Environment Variables for Your App

Add to your `.env` or ECS task definition:
```env
AWS_S3_BUCKET=ortmeier-job-files
AWS_S3_REGION=us-east-2
AWS_S3_MAX_FILE_SIZE=10485760
```

## 5. S3 Lifecycle Policy

Create `s3-lifecycle.json`:
```json
{
  "Rules": [
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      }
    },
    {
      "Id": "DeleteTempFiles",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "temp/"
      },
      "Expiration": {
        "Days": 1
      }
    },
    {
      "Id": "TransitionToIA",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "jobs/"
      },
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        }
      ]
    }
  ]
}
```

## 6. Optional: CloudFront CDN Setup

```bash
# Create CloudFront distribution
aws cloudfront create-distribution \
  --distribution-config file://cloudfront-config.json
```

CloudFront config example:
```json
{
  "CallerReference": "ortmeier-job-files-cdn",
  "Comment": "CDN for job file uploads",
  "DefaultRootObject": "",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-ortmeier-job-files",
        "DomainName": "ortmeier-job-files.s3.us-east-2.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-ortmeier-job-files",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0,
    "DefaultTTL": 86400,
    "MaxTTL": 31536000
  },
  "Enabled": true
}
```

## 7. Test the Setup

```bash
# Test upload
echo "test" > test.txt
aws s3 cp test.txt s3://ortmeier-job-files/test/test.txt

# Test read
aws s3 cp s3://ortmeier-job-files/test/test.txt ./downloaded.txt

# Test delete
aws s3 rm s3://ortmeier-job-files/test/test.txt
```

## Folder Structure in S3

```
ortmeier-job-files/
├── jobs/
│   ├── {jobId}/
│   │   ├── photos/
│   │   ├── documents/
│   │   └── invoices/
├── profiles/
│   └── {userId}/
│       └── avatar.jpg
└── temp/
    └── {uploadId}/
```

## Security Notes

1. **Never make bucket public** - Use presigned URLs
2. **Enable versioning** - For backup/recovery
3. **Use lifecycle policies** - To manage costs
4. **Encrypt at rest** - S3 default encryption
5. **Monitor with CloudWatch** - Track usage and costs