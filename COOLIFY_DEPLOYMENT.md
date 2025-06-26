# Coolify Deployment Guide - Ortmeier Job Management

This guide will help you deploy the Ortmeier Job Management application to Coolify.

## Prerequisites

- Coolify server set up and running
- Domain name pointed to your Coolify server
- Git repository with your code
- Supabase database (already configured)

## Step 1: Prepare Your Repository

1. **Commit all changes to your Git repository:**
   ```bash
   git add .
   git commit -m "Add Coolify deployment configuration"
   git push origin main
   ```

## Step 2: Create Application in Coolify

1. **Log into your Coolify dashboard**
2. **Create a new Application:**
   - Click "New Resource" → "Application"
   - Choose "Git Repository" as source
   - Connect your Git repository
   - Select the branch (usually `main` or `master`)

3. **Configure Build Settings:**
   - **Build Pack:** Docker
   - **Dockerfile Location:** `./Dockerfile`
   - **Port:** 3000
   - **Health Check Path:** `/api/database-status`

## Step 3: Set Environment Variables

In your Coolify application settings, add these environment variables:

### Required Variables:
```env
DATABASE_URL=postgresql://postgres.xudcmdliqyarbfdqufbq:tucbE1-dumqap-cynpyx@aws-0-us-east-2.pooler.supabase.com:6543/postgres
JWT_SECRET=cwlLQt/XMM9uLCOmP+XKA2l8UUb7PKNVSBQ0zW3T1gIA6Qs9Ypw0a3n66Rsp4buGYHTz6//wshSFaKE/CddnBw==
NEXTAUTH_SECRET=cwlLQt/XMM9uLCOmP+XKA2l8UUb7PKNVSBQ0zW3T1gIA6Qs9Ypw0a3n66Rsp4buGYHTz6//wshSFaKE/CddnBw==
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
```

### Domain-Specific Variables (Update with your domain):
```env
NEXTAUTH_URL=https://your-domain.com
QB_REDIRECT_URI=https://your-domain.com/api/quickbooks/callback
```

### Optional QuickBooks Variables:
```env
QB_CLIENT_ID=your_quickbooks_client_id
QB_CLIENT_SECRET=your_quickbooks_client_secret
QB_SANDBOX_MODE=false
```

## Step 4: Configure Domain

1. **Add your domain in Coolify:**
   - Go to "Domains" section
   - Add your domain (e.g., `ortmeier.yourdomain.com`)
   - Enable SSL/TLS (Let's Encrypt)

## Step 5: Deploy

1. **Start the deployment:**
   - Click "Deploy" in your Coolify application
   - Monitor the build logs
   - Wait for the deployment to complete

2. **Verify deployment:**
   - Visit your domain
   - Check that the application loads
   - Test login functionality
   - Verify database connectivity

## Step 6: Post-Deployment Setup

### Create Test Users (Optional)
If you want to create test users in production:

1. **Connect to your server via SSH**
2. **Run the user creation script:**
   ```bash
   # Get into the container
   docker exec -it your-container-name sh
   
   # Run the test user script
   node create-test-users.js
   ```

### Monitor Application
- Check Coolify logs for any errors
- Monitor application performance
- Set up log retention policies

## Troubleshooting

### Build Fails
- Check the build logs in Coolify
- Verify all required files are committed to Git
- Ensure Docker has enough resources

### Application Won't Start
- Check environment variables are set correctly
- Verify database connection string
- Check application logs

### Database Connection Issues
- Verify Supabase is accessible from your server
- Check if your server IP needs to be whitelisted
- Test database connection manually

### SSL/HTTPS Issues
- Ensure domain DNS is pointing to Coolify server
- Check Let's Encrypt certificate generation
- Verify NEXTAUTH_URL uses https://

## Backup Strategy

### Database Backups
- Supabase handles automatic backups
- Consider additional backup strategies for critical data

### Application Backups
- Git repository serves as source backup
- Coolify may have built-in backup features

## Performance Optimization

### Resource Allocation
- Monitor CPU and memory usage
- Adjust container resources in Coolify if needed

### Database Performance
- Monitor Supabase performance metrics
- Consider connection pooling optimizations

## Security Considerations

1. **Environment Variables:**
   - Use strong, unique secrets for production
   - Never commit secrets to Git
   - Rotate secrets regularly

2. **Network Security:**
   - Ensure Coolify server is properly secured
   - Use firewall rules to restrict access
   - Keep Coolify and system updated

3. **Application Security:**
   - Monitor for security vulnerabilities
   - Keep dependencies updated
   - Review audit logs regularly

## Support

If you encounter issues:
1. Check Coolify documentation
2. Review application logs
3. Check Supabase status
4. Verify DNS and domain configuration

## Test Users for Production

After deployment, you can use these test accounts:

| Name | Role | Email | Password |
|------|------|-------|----------|
| Tim Ortmeier | OWNER | tim@ortmeier.com | Test1234! |
| Tim's Son | ADMIN | son@ortmeier.com | Test1234! |
| Rachel | OFFICE | rachel@ortmeier.com | Test1234! |
| Mike | TECHNICIAN | mike@ortmeier.com | Test1234! |
| Viewer Joe | VIEWER | viewer@ortmeier.com | Test1234! |

**Remember to change these passwords and create real user accounts for production use!**