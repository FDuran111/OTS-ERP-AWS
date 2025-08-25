# AWS Deployment Checklist

## ✅ Application Status
- **Build**: ✅ Successful
- **Local Testing**: ✅ All features working
- **Database Schema**: ✅ Complete migration script created

## 🚀 Deployment Steps

### 1. Prerequisites
Before deploying, ensure you have:
- [ ] AWS Account with appropriate permissions
- [ ] GitHub repository with the code
- [ ] AWS CLI configured (optional, for manual tasks)

### 2. GitHub Secrets Required
Add these secrets to your GitHub repository (Settings → Secrets → Actions):
```
AWS_DEPLOYER_ROLE_ARN    # IAM role for GitHub Actions deployment
```

### 3. Environment Variables for AWS
These will be set in AWS Amplify or your deployment platform:
```env
# Database (RDS PostgreSQL)
DATABASE_URL=postgresql://username:password@your-rds-endpoint.rds.amazonaws.com:5432/dbname

# Storage (S3)
STORAGE_PROVIDER=s3
S3_BUCKET=your-staging-bucket-name
S3_REGION=us-east-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# Application
NEXT_PUBLIC_ENV=staging
JWT_SECRET=your-secure-jwt-secret
```

### 4. Deployment Process

#### Step 1: Commit and Push
```bash
git add .
git commit -m "Deploy to AWS staging"
git push origin main
```

#### Step 2: Infrastructure Deployment (First Time Only)
- Go to GitHub Actions
- Select "Deploy Staging Infrastructure & Migrations"
- Click "Run workflow" with `deploy_infra: true`
- OR commit with message containing `[deploy-infra]`

#### Step 3: Database Setup
After RDS is created, connect and run:
```bash
psql -h your-rds-endpoint.rds.amazonaws.com -U postgres -d your-database < scripts/aws-db-migration.sql
```

#### Step 4: Application Deployment
The application will deploy automatically when you push to main/staging branches.

### 5. Post-Deployment Verification
- [ ] Check application health: `https://your-app.amplifyapp.com/api/health`
- [ ] Test login with admin@admin.com / OTS123
- [ ] Run smoke tests: `npm run smoke:staging`
- [ ] Verify file uploads work (S3)
- [ ] Check database connectivity

## 📝 Important Notes

### Storage Configuration
The application is configured to use **AWS S3** for file storage in staging/production:
- The `supabase.ts` file exists but is NOT used in AWS environments
- The storage provider is dynamically selected based on `STORAGE_PROVIDER` env var
- In AWS: `STORAGE_PROVIDER=s3` forces S3 usage
- The code automatically prevents Supabase usage in staging/production

### Why Supabase File Still Exists
- Kept for potential local development flexibility
- Dynamic imports ensure it's never loaded in AWS environments
- The `assertEnvIsolation.ts` actively blocks Supabase in AWS

### Database
- Using AWS RDS PostgreSQL (not Supabase)
- All tables and schema are in `scripts/aws-db-migration.sql`
- No Supabase dependencies for database

## 🔒 Security
- JWT tokens for authentication (not Supabase Auth)
- S3 bucket policies for file access control
- RDS security groups limit database access
- Environment isolation enforced in code

## 📊 Monitoring
- CloudWatch logs for application monitoring
- RDS monitoring for database performance
- S3 metrics for storage usage
- Budget alarms set at $35/month for staging

## 🆘 Troubleshooting

### Build Failures
- Check `npm run build` locally
- Review TypeScript errors
- Ensure all environment variables are set

### Database Connection Issues
- Verify RDS security group allows access
- Check DATABASE_URL format
- Ensure RDS instance is running

### File Upload Issues
- Verify S3 bucket exists and has correct permissions
- Check AWS credentials
- Ensure CORS is configured on S3 bucket

## 🎯 Next Steps
1. Deploy to staging first
2. Test thoroughly
3. Then deploy to production with same process