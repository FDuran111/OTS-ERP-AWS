# Production Setup Guide

## Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
DIRECT_URL="postgresql://user:password@host:port/database?sslmode=require"

# Authentication
JWT_SECRET="your-secure-jwt-secret-min-32-chars"
ADMIN_SETUP_KEY="your-secure-admin-setup-key"

# Migrations
RUN_MIGRATIONS_ON_STARTUP="true"
MIGRATION_AUTH_TOKEN="your-secure-migration-token"

# Error Tracking (optional but recommended)
SENTRY_DSN="your-sentry-dsn"
SENTRY_ENVIRONMENT="production"

# Performance Monitoring (optional)
ENABLE_PERFORMANCE_MONITORING="true"
LOG_SLOW_QUERIES="true"
SLOW_QUERY_THRESHOLD_MS="1000"

# Application
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

## Database Setup

### 1. Initial Setup

```bash
# Run migrations manually (recommended for first deployment)
curl -X POST https://your-domain.com/api/migrations/run \
  -H "Authorization: Bearer your-secure-migration-token"
```

### 2. Automatic Migrations

If `RUN_MIGRATIONS_ON_STARTUP=true`, migrations will run automatically when the app starts.

### 3. Manual Migration

```bash
# Connect to your production database
psql $DATABASE_URL

# Run the crew hours tracking migration
\i src/lib/db-migrations/add-crew-hours-tracking.sql

# Verify tables
\dt
```

## Deployment Steps

### 1. Build the Application

```bash
# Install dependencies
npm ci --production=false

# Build
npm run build

# Prune dev dependencies
npm prune --production
```

### 2. Health Checks

Create health check endpoints:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    await query('SELECT 1')
    
    return NextResponse.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Database connection failed' },
      { status: 503 }
    )
  }
}
```

### 3. Monitoring

The app includes built-in monitoring for:
- Database query performance
- Missing database columns (automatic fallbacks)
- Error tracking
- Report generation metrics

### 4. Security Checklist

- [ ] All environment variables set
- [ ] Database SSL enabled
- [ ] JWT secret is strong (32+ characters)
- [ ] Migration token is set
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints

## Feature Flags

The crew productivity report automatically detects and handles:
- Missing `hoursWorked` column (uses 8-hour default)
- Missing `overtimeHours` column
- Missing `CrewDailyHours` table

## Troubleshooting

### Database Connection Issues

Check connection string format:
```
postgresql://username:password@host:port/database?sslmode=require
```

### Migration Failures

1. Check migration logs
2. Verify database permissions
3. Run migrations manually if needed

### Performance Issues

1. Enable slow query logging
2. Check database indexes
3. Monitor API response times

## Backup Strategy

1. **Database Backups**
   - Daily automated backups
   - Point-in-time recovery enabled
   - Test restore procedures monthly

2. **Application Backups**
   - Git repository backups
   - Environment variable backups (encrypted)

## Scaling Considerations

1. **Database**
   - Connection pooling configured
   - Read replicas for reports
   - Indexes on frequently queried columns

2. **Application**
   - Horizontal scaling ready
   - Stateless design
   - CDN for static assets

## Maintenance Windows

Recommended maintenance:
- Database migrations: During low traffic
- Application updates: Blue-green deployment
- Backup verification: Monthly