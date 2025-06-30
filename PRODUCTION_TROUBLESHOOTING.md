# Production Login Issue Troubleshooting Guide

## Common Causes for 500 Error on Login in Production

### 1. **Missing Environment Variables in Coolify**

The most common cause is missing or incorrect environment variables. In Coolify, you need to set:

```
DATABASE_URL=postgresql://postgres.xudcmdliqyarbfdqufbq:yJ4E5uvqd42Svz97@aws-0-us-east-2.pooler.supabase.com:6543/postgres
JWT_SECRET=cwlLQt/XMM9uLCOmP+XKA2l8UUb7PKNVSBQ0zW3T1gIA6Qs9Ypw0a3n66Rsp4buGYHTz6//wshSFaKE/CddnBw==
NEXTAUTH_SECRET=cwlLQt/XMM9uLCOmP+XKA2l8UUb7PKNVSBQ0zW3T1gIA6Qs9Ypw0a3n66Rsp4buGYHTz6//wshSFaKE/CddnBw==
NEXTAUTH_URL=https://your-production-domain.com
```

**IMPORTANT**: The JWT_SECRET must be EXACTLY the same as in development if you have existing users.

### 2. **Database Connection Issues**

Production might have different networking requirements:

- **Supabase Pooler**: The connection string uses the pooler. Make sure:
  - The pooler endpoint is accessible from your production server
  - No firewall is blocking port 6543
  - The database password hasn't changed

### 3. **SSL/TLS Requirements**

Some production environments require SSL for PostgreSQL connections. Try adding to your DATABASE_URL:
```
?sslmode=require
```

### 4. **Build-time vs Runtime Environment Variables**

Next.js differentiates between:
- Build-time variables (available during `npm run build`)
- Runtime variables (available when the app runs)

Make sure DATABASE_URL and JWT_SECRET are available at runtime.

## Debugging Steps

### 1. **Use the Debug Endpoint**

Visit: `https://your-domain.com/api/debug`

This will show:
- Environment variable status
- Database connection status
- JWT token generation status

### 2. **Check Coolify Logs**

In Coolify, check the application logs for specific error messages:
```bash
# Look for database connection errors
# Look for "Cannot read properties of undefined"
# Look for JWT-related errors
```

### 3. **Test Database Connection**

Create a simple test in Coolify's console:
```javascript
const { Pool } = require('pg')
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
pool.query('SELECT NOW()').then(console.log).catch(console.error)
```

### 4. **Verify Environment Variables**

In your production environment, verify variables are set:
```bash
echo $DATABASE_URL
echo $JWT_SECRET
```

## Quick Fix Checklist

1. [ ] Set DATABASE_URL in Coolify environment variables
2. [ ] Set JWT_SECRET (must match development for existing users)
3. [ ] Set NEXTAUTH_SECRET (same as JWT_SECRET)
4. [ ] Set NEXTAUTH_URL to your production URL
5. [ ] Restart the application in Coolify
6. [ ] Clear browser cookies/cache and try again

## Alternative Solutions

### If Database Connection Fails:

1. **Try Direct Connection** (instead of pooler):
   ```
   DATABASE_URL=postgresql://postgres.xudcmdliqyarbfdqufbq:yJ4E5uvqd42Svz97@db.xudcmdliqyarbfdqufbq.supabase.co:5432/postgres
   ```

2. **Add SSL Mode**:
   ```
   DATABASE_URL=postgresql://...?sslmode=require
   ```

### If JWT Issues:

1. Generate a new JWT_SECRET (but you'll need to reset all user passwords):
   ```bash
   openssl rand -base64 64
   ```

2. Ensure bcryptjs is installed in production:
   ```json
   "dependencies": {
     "bcryptjs": "^2.4.3",
     "jsonwebtoken": "^9.0.2"
   }
   ```

## Emergency Access

If you need to bypass authentication temporarily:

1. Create a temporary access token endpoint
2. Use direct database queries to verify user data
3. Check if the User table has the expected data

## Contact Support

If issues persist:
- Check Supabase dashboard for database status
- Verify Coolify deployment settings
- Review Next.js production build logs