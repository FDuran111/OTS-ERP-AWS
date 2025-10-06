#!/usr/bin/env node

/**
 * Integration Test Suite
 * Tests all major features added from Replit
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3000';
let authToken = null;
let testUserId = null;
let testJobId = null;
let testTimeEntryId = null;

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Cookie'] = `auth-token=${token}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test runner
async function test(name, fn) {
  try {
    console.log(`\n🧪 ${name}...`);
    await fn();
    console.log(`   ✅ PASSED`);
    results.passed++;
    results.tests.push({ name, status: 'PASSED' });
  } catch (error) {
    console.log(`   ❌ FAILED: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'FAILED', error: error.message });
  }
}

// Assertion helper
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ===================================
// TEST SUITE
// ===================================

async function runTests() {
  console.log('\n🚀 Starting Integration Tests\n');
  console.log('='.repeat(50));

  // 1. Test Health Check
  await test('Health Check', async () => {
    const res = await makeRequest('GET', '/api/health');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.status === 'ok', 'Health check should return ok');
  });

  // 2. Test Authentication
  await test('Login with admin credentials', async () => {
    const res = await makeRequest('POST', '/api/auth/login', {
      email: 'admin@admin.com',
      password: 'admin123'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user, 'Should return user object');

    // Extract token from Set-Cookie header
    const cookies = res.headers['set-cookie'];
    if (cookies) {
      const tokenCookie = cookies.find(c => c.startsWith('auth-token='));
      if (tokenCookie) {
        authToken = tokenCookie.split(';')[0].split('=')[1];
      }
    }

    testUserId = res.data.user.id;
    console.log(`   📝 User ID: ${testUserId}`);
  });

  // 3. Test Get Current User
  await test('Get current user info', async () => {
    const res = await makeRequest('GET', '/api/auth/me', null, authToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.email === 'admin@admin.com', 'Should return admin user');
  });

  // 4. Test Get Jobs (need a job for time entries)
  await test('Fetch jobs list', async () => {
    const res = await makeRequest('GET', '/api/jobs', null, authToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);

    if (res.data.jobs && res.data.jobs.length > 0) {
      testJobId = res.data.jobs[0].id;
      console.log(`   📝 Test Job ID: ${testJobId}`);
    } else {
      console.log(`   ⚠️  No jobs found - time entry tests may fail`);
    }
  });

  // 5. Test Time Entry Creation
  if (testJobId && testUserId) {
    await test('Create time entry', async () => {
      const res = await makeRequest('POST', '/api/time-entries', {
        userId: testUserId,
        jobId: testJobId,
        date: new Date().toISOString(),
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours later
        hours: 8,
        description: 'Integration test time entry'
      }, authToken);

      assert(res.status === 200 || res.status === 201, `Expected 200/201, got ${res.status}`);
      assert(res.data.timeEntry || res.data.id, 'Should return created time entry');

      testTimeEntryId = res.data.timeEntry?.id || res.data.id;
      console.log(`   📝 Time Entry ID: ${testTimeEntryId}`);
    });
  }

  // 6. Test Time Entry Approval (tests trigger for JobLaborCost creation)
  if (testTimeEntryId) {
    await test('Approve time entry (triggers JobLaborCost creation)', async () => {
      const res = await makeRequest('POST', `/api/time-entries/${testTimeEntryId}/approve`, {}, authToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success || res.data.entry, 'Should return success response');

      if (res.data.laborCostId) {
        console.log(`   📝 JobLaborCost ID: ${res.data.laborCostId}`);
      }
    });

    // 7. Test Audit Trail was Created
    await test('Verify audit trail for approval', async () => {
      const res = await makeRequest('GET', `/api/audits/time-entries?entryId=${testTimeEntryId}`, null, authToken);
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.data) || res.data.audits, 'Should return audit array');

      const audits = res.data.audits || res.data;
      const approvalAudit = audits.find(a => a.action === 'APPROVE' || a.action === 'LABOR_COST_GENERATED');
      assert(approvalAudit, 'Should have audit record for approval');
      console.log(`   📝 Found ${audits.length} audit records`);
    });
  }

  // 8. Test Rejection with Notes
  if (testTimeEntryId) {
    // Create another time entry to reject
    await test('Create and reject time entry with notes', async () => {
      const createRes = await makeRequest('POST', '/api/time-entries', {
        userId: testUserId,
        jobId: testJobId,
        date: new Date().toISOString(),
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        hours: 4,
        description: 'Test rejection'
      }, authToken);

      const rejectEntryId = createRes.data.timeEntry?.id || createRes.data.id;

      const rejectRes = await makeRequest('POST', `/api/time-entries/${rejectEntryId}/reject`, {
        rejectionReason: 'Test rejection for integration testing'
      }, authToken);

      assert(rejectRes.status === 200, `Expected 200, got ${rejectRes.status}`);
      assert(rejectRes.data.success || rejectRes.data.entry, 'Should return success');
      console.log(`   📝 Rejected Entry ID: ${rejectEntryId}`);
    });
  }

  // 9. Test Bulk Approve
  await test('Bulk approve time entries', async () => {
    // This might fail if no pending entries exist
    const res = await makeRequest('POST', '/api/time-entries/bulk-approve', {
      timeEntryIds: [], // Empty array should handle gracefully
      notes: 'Bulk approve test'
    }, authToken);

    // Accept both success with 0 entries or actual approval
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    console.log(`   📝 Approved: ${res.data.approved || 0} entries`);
  });

  // 10. Test Weekly Summary
  await test('Fetch weekly time summary', async () => {
    const res = await makeRequest('GET', '/api/time-entries/weekly-summary', null, authToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.summary || Array.isArray(res.data), 'Should return summary data');
  });

  // 11. Test Admin Audit Health
  await test('Check audit health report', async () => {
    const res = await makeRequest('GET', '/api/admin/audit-health', null, authToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.totalAudits !== undefined, 'Should return audit statistics');
    console.log(`   📝 Total Audits: ${res.data.totalAudits}`);
  });

  // Print Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 TEST SUMMARY\n');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total:  ${results.passed + results.failed}`);

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => t.status === 'FAILED').forEach(t => {
      console.log(`   - ${t.name}: ${t.error}`);
    });
  }

  console.log('\n' + '='.repeat(50) + '\n');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
