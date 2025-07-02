# Production Deployment Guide

## Prerequisites

1. **Infrastructure Requirements**
   - PostgreSQL 15+ database
   - Redis 7+ for caching and sessions
   - S3-compatible storage for file uploads
   - SSL certificates
   - Domain name with DNS configured

2. **Environment Setup**
   - Node.js 20+ 
   - Docker & Docker Compose (optional)
   - PM2 for process management (if not using Docker)

## Step 1: Database Setup

1. Run schema migrations:
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/001_production_schema_fixes.sql
```

2. Create required indexes:
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f migrations/002_performance_indexes.sql
```

3. Set up database backups:
```bash
# Add to crontab
0 2 * * * pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > /backups/ojm_$(date +\%Y\%m\%d).sql.gz
```

## Step 2: Environment Configuration

1. Copy and configure production environment:
```bash
cp .env.example .env.production
```

2. Set all required environment variables:
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Authentication
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# Redis
REDIS_URL=redis://user:pass@host:6379

# AWS S3
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=ojm-uploads

# Email
EMAIL_SERVER=smtp://user:pass@smtp.server.com:587
EMAIL_FROM=noreply@yourdomain.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

## Step 3: Build and Deploy

### Option A: Docker Deployment

1. Build production image:
```bash
docker build -t ojm-app:latest --build-arg NODE_ENV=production .
```

2. Run with Docker Compose:
```bash
docker-compose -f docker-compose.production.yml up -d
```

### Option B: Direct Deployment

1. Install dependencies and build:
```bash
npm ci --only=production
npm run build
```

2. Start with PM2:
```bash
pm2 start ecosystem.config.js --env production
```

## Step 4: Security Hardening

1. **Set Security Headers** (nginx.conf):
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

2. **Configure Firewall**:
```bash
# Allow only necessary ports
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

3. **Set up SSL with Let's Encrypt**:
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Step 5: Monitoring Setup

1. **Application Monitoring**:
   - Configure Sentry for error tracking
   - Set up DataDog or New Relic for APM
   - Configure CloudWatch for AWS resources

2. **Log Aggregation**:
   - Set up centralized logging (ELK stack or CloudWatch Logs)
   - Configure log rotation

3. **Uptime Monitoring**:
   - Configure Pingdom or UptimeRobot
   - Set up alerts for downtime

## Step 6: Performance Optimization

1. **Enable Caching**:
   - Redis for session storage
   - CloudFront for static assets
   - API response caching

2. **Database Optimization**:
   - Enable query logging and slow query analysis
   - Set up connection pooling
   - Regular VACUUM and ANALYZE

3. **Asset Optimization**:
   - Enable Next.js image optimization
   - Use CDN for static assets
   - Enable gzip compression

## Step 7: Backup and Disaster Recovery

1. **Database Backups**:
   - Daily automated backups
   - Test restore procedures
   - Off-site backup storage

2. **File Storage Backups**:
   - S3 cross-region replication
   - Versioning enabled

3. **Configuration Backups**:
   - Version control for all configs
   - Infrastructure as Code (Terraform)

## Step 8: Post-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] SSL certificates installed
- [ ] Security headers configured
- [ ] Monitoring alerts set up
- [ ] Backup procedures tested
- [ ] Load testing completed
- [ ] Error tracking verified
- [ ] Admin user created
- [ ] Email sending tested
- [ ] File uploads working
- [ ] Payment processing tested (if applicable)

## Maintenance Tasks

### Daily
- Monitor error logs
- Check system resources
- Verify backup completion

### Weekly
- Review performance metrics
- Update dependencies (security patches)
- Test backup restoration

### Monthly
- Security audit
- Performance optimization review
- Cost optimization review

## Rollback Procedure

1. **Quick Rollback**:
```bash
# If using Docker
docker-compose down
docker-compose up -d --scale app=0
docker run -d --name ojm-app-old ojm-app:previous-version

# If using PM2
pm2 stop all
git checkout previous-tag
npm ci && npm run build
pm2 restart all
```

2. **Database Rollback**:
```bash
# Stop application
# Restore from backup
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < backup.sql
# Restart application
```

## Support Contacts

- **Infrastructure**: infrastructure@company.com
- **Security Issues**: security@company.com
- **On-Call**: +1-XXX-XXX-XXXX

## Common Issues and Solutions

### High Memory Usage
- Check for memory leaks in time tracking
- Increase Node.js heap size
- Enable swap if needed

### Slow Database Queries
- Run EXPLAIN ANALYZE on slow queries
- Add missing indexes
- Consider query optimization

### File Upload Failures
- Check S3 permissions
- Verify CORS configuration
- Check file size limits