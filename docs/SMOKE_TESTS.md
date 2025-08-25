# Smoke Tests & Monitoring Documentation

## Overview
The OTS-ARP-AWS project includes comprehensive smoke tests and uptime monitoring to ensure staging environment health. Tests run automatically in CI/CD and continuously monitor staging availability.

## Test Coverage

### 1. Health Check
- **Endpoint:** `GET /api/health`
- **Verifies:** API is responding
- **Expected:** `{ok: true}`

### 2. Authentication
- **Verifies:** Basic auth is properly configured
- **Expected:** 401 without credentials, 200 with credentials

### 3. Database Connectivity
- **Endpoint:** `GET /api/jobs?limit=1`
- **Verifies:** Database connection is working
- **Expected:** 200 response (not 500)

### 4. Jobs API - List
- **Endpoint:** `GET /api/jobs`
- **Verifies:** Jobs can be retrieved
- **Expected:** Array of jobs

### 5. Jobs API - CRUD
- **Endpoints:** 
  - `POST /api/jobs` (create)
  - `GET /api/jobs/:id` (retrieve)
- **Verifies:** Create and retrieve operations work
- **Expected:** Job created and retrieved with matching ID

### 6. File Upload
- **Endpoint:** `POST /api/files/upload`
- **Verifies:** File upload to S3 works
- **Expected:** File uploaded successfully

### 7. Storage Provider Check
- **Endpoint:** `GET /api/health`
- **Verifies:** S3 is being used (not Supabase) in staging
- **Expected:** `storageProvider: "s3"` for AWS environments

## Running Smoke Tests

### Automatic (CI/CD)
Tests run automatically after every staging deployment:
1. After infrastructure deployment
2. After database migrations
3. After Amplify environment update
4. **Before** marking deployment as successful

### Manual - Quick Run
```bash
# Run with automatic URL and credential detection
./scripts/run-smoke-tests.sh

# Run with specific URL
./scripts/run-smoke-tests.sh https://main.d123456.amplifyapp.com
```

### Manual - Direct Node
```bash
# Set environment variables
export STAGING_BASE_URL="https://main.d123456.amplifyapp.com"
export STAGING_BASIC_AUTH="staging:password123"

# Run tests
node scripts/smoke-staging.mjs
```

### Manual - From AWS
```bash
# Get URL from AWS
AMPLIFY_APP_ID=$(aws amplify list-apps \
  --query "apps[?name=='ots-arp-aws-staging-app'].appId" \
  --output text)

AMPLIFY_DOMAIN=$(aws amplify get-app \
  --app-id "$AMPLIFY_APP_ID" \
  --query "app.defaultDomain" \
  --output text)

# Get credentials from Secrets Manager
AWS_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id ots-arp-aws-staging-basic-auth \
  --query SecretString --output text)

USERNAME=$(echo "$AWS_SECRET" | jq -r '.username')
PASSWORD=$(echo "$AWS_SECRET" | jq -r '.password')

# Run tests
export STAGING_BASE_URL="https://main.${AMPLIFY_DOMAIN}"
export STAGING_BASIC_AUTH="${USERNAME}:${PASSWORD}"
node scripts/smoke-staging.mjs
```

## Test Output

### Success Output
```
========================================
🚀 Staging Smoke Tests
========================================
Base URL: https://main.d123456.amplifyapp.com
Basic Auth: Configured

Testing Health Check... ✅ PASS
Testing Authentication... ✅ PASS: Basic auth properly enforced
Testing Database Connectivity... ✅ PASS: Database accessible
Testing Get Jobs List... ✅ PASS: Found 8 jobs
Testing Create and Get Job... ✅ PASS: Created and retrieved job ID 123
Testing File Upload... ✅ PASS: File uploaded

========================================
📊 Test Summary
========================================
Total Tests: 6
Passed: 6
Success Rate: 100%

✅ All smoke tests passed!
Staging deployment is healthy.
```

### Failure Output
```
Testing Health Check... ❌ FAIL: Status 503
Testing Authentication... ✅ PASS
Testing Database Connectivity... ❌ FAIL: Database connection error (500)
...

========================================
📊 Test Summary
========================================
Total Tests: 6
Passed: 4
Failed: 2
Success Rate: 67%

❌ Some tests failed.
Please check the staging deployment.
```

## Exit Codes

- **0**: All tests passed
- **1**: One or more tests failed

CI/CD will fail the deployment if exit code is non-zero.

## Adding New Tests

To add a new smoke test:

1. **Create test function** in `scripts/smoke-staging.mjs`:
```javascript
async function testNewFeature() {
  const response = await makeRequest('/api/new-feature');
  
  if (!response.ok) {
    return { 
      success: false, 
      message: `Status ${response.status}` 
    };
  }
  
  return { success: true };
}
```

2. **Add to main()** function:
```javascript
await runTest('New Feature', testNewFeature);
```

3. **Update documentation** in this file

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Basic auth not configured | Check STAGING_BASIC_AUTH env var |
| 503 Service Unavailable | Amplify still deploying | Wait 30-60 seconds |
| Connection refused | Wrong URL | Verify STAGING_BASE_URL |
| Database test fails | RDS not accessible | Check VPC configuration |
| File upload fails | S3 permissions | Check IAM roles |

### Debug Mode

For verbose output, modify the script:
```javascript
// Add at top of makeRequest()
console.log(`[DEBUG] ${options.method || 'GET'} ${url}`);
```

### Manual Health Check

Quick health check without running all tests:
```bash
# With basic auth
curl -u staging:password https://main.d123456.amplifyapp.com/api/health

# Check response
# Should return: {"ok":true,"checks":{"api":true,"database":true}}
```

## CI/CD Integration

The smoke tests are integrated into `.github/workflows/deploy-staging.yml`:

1. **Runs after:** Amplify deployment and migrations
2. **Gets credentials:** From AWS Secrets Manager
3. **Waits:** 30 seconds for deployment stabilization
4. **Fails pipeline:** If any test fails
5. **Reports:** In GitHub Actions summary

## Best Practices

1. **Keep tests fast:** Should complete in <30 seconds
2. **Test core flows:** Focus on critical functionality
3. **Idempotent:** Tests should not affect each other
4. **Clean up:** Test data should be clearly marked
5. **Informative:** Clear error messages for failures

## Security Notes

- Basic auth credentials are masked in CI/CD logs
- Test creates data with clear markers (e.g., "Smoke Test Job")
- File uploads use test category for easy cleanup
- No production data is modified

## Maintenance

- Review test coverage monthly
- Update tests when adding major features
- Monitor test execution time
- Clean up old test data periodically

## Uptime Check (Scheduled)

### Overview
Automated health monitoring runs every 10 minutes via GitHub Actions to ensure staging availability.

### Configuration
- **Workflow:** `.github/workflows/uptime-check.yml`
- **Schedule:** Every 10 minutes (cron: `*/10 * * * *`)
- **Failure Threshold:** 3 consecutive failures trigger issue creation

### Features

#### Automatic Issue Creation
After 3 consecutive health check failures:
1. Creates GitHub issue with `uptime-check` and `staging` labels
2. Includes failure timestamps and response details
3. Provides troubleshooting links

#### Automatic Recovery
When health check recovers:
1. Adds recovery comment to open issue
2. Automatically closes the issue
3. Resets failure counter

### Finding Uptime Issues
- Search: [Open Uptime Issues](../../issues?q=is%3Aissue+is%3Aopen+label%3Auptime-check)
- Labels: `uptime-check`, `staging`, `automated`, `high-priority`

### Manual Trigger
1. Go to [Actions](../../actions)
2. Select "Staging Uptime Check"
3. Click "Run workflow"
4. Optional: Force failure for testing

## Local Uptime Script

### Quick Health Check
Use the local script for manual health verification:

```bash
# Auto-fetch from AWS
./scripts/uptime-local.sh --aws

# Manual URL
./scripts/uptime-local.sh --url https://staging.example.com

# With credentials
./scripts/uptime-local.sh \
  --url https://staging.example.com \
  --username staging \
  --password secret123
```

### Script Options
- `--url URL`: Staging URL
- `--username USER`: Basic auth username  
- `--password PASS`: Basic auth password
- `--aws`: Fetch config from AWS
- `--help`: Show usage

### Output Example
```
=========================================
   🏥 Staging Uptime Check
=========================================

📍 Target: https://staging.example.com/api/health
🔐 Using basic authentication

🚀 Performing health check...
----------------------------------------
⏰ Timestamp: 2024-01-01 12:00:00 UTC
📊 HTTP Status: 200

📝 Response:
{
  "ok": true,
  "environment": "staging",
  "storageProvider": "s3",
  "checks": {
    "api": true,
    "database": true
  }
}

=========================================
   📈 Results
=========================================

✅ Health check PASSED

📋 Details:
  • Environment: staging
  • Database: true
  • Storage: s3

✅ Staging is healthy! 🎉
```

## Related Documentation

- [AWS Services Lock](./AWS_SERVICES_LOCK.md)
- [Migration & Seeding](./MIGRATION_SEEDING.md)
- [Staging Runbook](./RUNBOOK_STAGING.md)
- [Network Verification](./NAT_FREE_ARCHITECTURE.md)