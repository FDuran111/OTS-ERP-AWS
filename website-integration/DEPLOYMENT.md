# Production Deployment Guide

## Current Production Setup

### ERP System (Already Deployed)
- **URL**: `http://ots-erp-alb-1229912979.us-east-2.elb.amazonaws.com`
- **Platform**: AWS ECS with Application Load Balancer
- **Database**: AWS RDS PostgreSQL
- **Storage**: AWS S3 (ots-erp-prod-uploads)

### Website Deployment Options

## Option 1: AWS S3 + CloudFront (Recommended)

Best for static HTML sites - cost-effective and fast.

```bash
# 1. Create S3 bucket for website
aws s3 mb s3://ortmeier-website

# 2. Enable static website hosting
aws s3 website s3://ortmeier-website \
  --index-document index.html \
  --error-document error.html

# 3. Upload website files
aws s3 sync ./ots-website s3://ortmeier-website --acl public-read

# 4. Set up CloudFront for HTTPS
# - Create distribution pointing to S3 bucket
# - Add custom domain (ortmeier.com)
# - Configure SSL certificate
```

**Update in website before deploying:**
- Use `erp-integration.prod.js` instead of `erp-integration.js`
- Or update the CONFIG section in your existing file

## Option 2: GitHub Pages

Free and simple if your website repo is on GitHub.

```bash
# 1. Create gh-pages branch
git checkout -b gh-pages

# 2. Add CNAME file for custom domain
echo "ortmeier.com" > CNAME

# 3. Update script to use production URL
# Use erp-integration.prod.js

# 4. Push to GitHub
git add .
git commit -m "Deploy to GitHub Pages"
git push origin gh-pages
```

## Option 3: Netlify/Vercel

Drag and drop deployment with automatic HTTPS.

1. Visit netlify.com or vercel.com
2. Drag your website folder to deploy
3. Configure custom domain
4. Update environment variables if needed

## Connection Requirements

### 1. Update CORS in ERP (if needed)

If your website uses a custom domain, add it to the allowed origins:

```typescript
// In src/app/api/public/forms/route.ts and analytics/route.ts
const allowedOrigins = [
  'https://ortmeier.com',
  'https://www.ortmeier.com',
  'http://ots-erp-alb-1229912979.us-east-2.elb.amazonaws.com',
  // ... existing origins
]
```

### 2. Update API Key (Optional but Recommended)

Change the API key in both systems for security:

**In ERP (.env or Secrets Manager):**
```env
WEBSITE_API_KEY=your-secure-random-key-here
```

**In Website JavaScript:**
```javascript
const CONFIG = {
  API_KEY: 'your-secure-random-key-here'
}
```

### 3. Enable HTTPS (Important)

For production, you should use HTTPS for both systems:

**ERP System:**
- Add SSL certificate to ALB
- Update URL to use https://

**Website:**
- S3 + CloudFront provides HTTPS automatically
- GitHub Pages provides HTTPS with custom domain
- Netlify/Vercel provide HTTPS automatically

## Testing Production Connection

### 1. Test from Browser Console

Open your deployed website and run in console:

```javascript
// Test analytics endpoint
fetch('http://ots-erp-alb-1229912979.us-east-2.elb.amazonaws.com/api/public/analytics', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'ots-website-2024-prod'
  },
  body: JSON.stringify({
    pageUrl: window.location.href,
    pageTitle: 'Test',
    eventType: 'page_view'
  })
}).then(r => r.json()).then(console.log)
```

### 2. Monitor in ERP Database

Check if events are being recorded:

```sql
-- Check recent page views
SELECT * FROM "CustomerActivity"
WHERE "activityType" = 'PAGE_VIEW'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check form submissions
SELECT * FROM "Lead"
WHERE source LIKE 'Website Form%'
ORDER BY "createdAt" DESC
LIMIT 10;
```

## Security Checklist

- [ ] Change default API key
- [ ] Enable HTTPS on both systems
- [ ] Configure CORS for production domain only
- [ ] Remove debug mode in production script
- [ ] Set up rate limiting (optional)
- [ ] Monitor for suspicious activity

## Environment Variables

### For AWS Deployment

Add to ECS task definition or Secrets Manager:
```env
WEBSITE_URL=https://ortmeier.com
WEBSITE_API_KEY=your-secure-key
```

### For Website

Update in JavaScript:
```javascript
const CONFIG = {
  ERP_API_URL: 'https://your-erp-domain.com',  // Use HTTPS in production
  API_KEY: 'your-secure-key',
  DEBUG: false
}
```

## Troubleshooting

### CORS Errors
- Ensure your website domain is in the allowedOrigins array
- Check browser console for specific error messages

### Connection Refused
- Verify ERP is running and accessible
- Check if ALB security group allows traffic
- Test with curl from EC2 instance

### Form Not Submitting
- Check browser console for JavaScript errors
- Verify API key matches in both systems
- Check network tab for response details

## Monitoring

### CloudWatch (AWS)
- Monitor ALB request count
- Check ECS task health
- Set up alarms for errors

### Application Monitoring
- Track form submission success rate
- Monitor page view trends
- Check for abandoned forms

## Next Steps

1. **Deploy Website** - Choose deployment method above
2. **Update Script** - Use production URL and API key
3. **Test Connection** - Submit test form
4. **Monitor** - Check database for new leads
5. **Optimize** - Add caching, CDN, etc.