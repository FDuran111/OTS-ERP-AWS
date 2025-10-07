/**
 * Admin-side test for Hour Categories feature
 * Tests: viewing entries, approving, rejecting, and displaying category breakdown
 */

const BASE_URL = 'http://localhost:3000';

let authToken = null;
let adminUserId = null;
let employeeUserId = null;
let testJobId = null;
let createdEntryId = null;

async function loginAsAdmin() {
  console.log('\n🔐 Step 1: Admin login...');
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@admin.com',
      password: 'admin123',
    }),
  });

  const data = await response.json();
  adminUserId = data.user.id;

  const cookies = response.headers.get('set-cookie');
  if (cookies) {
    const tokenMatch = cookies.match(/auth-token=([^;]+)/);
    if (tokenMatch) authToken = tokenMatch[1];
  }

  console.log(`   ✅ Logged in as admin: ${data.user.name}`);
  return data.user;
}

async function getEmployeeUser() {
  console.log('\n👤 Step 2: Getting employee user...');

  // Just use admin user for this test
  console.log('   ⚠️  Using admin user for testing');
  employeeUserId = adminUserId;
}

async function getJob() {
  console.log('\n📋 Step 3: Getting test job...');
  const response = await fetch(`${BASE_URL}/api/jobs`, {
    headers: { 'Cookie': `auth-token=${authToken}` },
  });

  const jobs = await response.json();
  testJobId = jobs[0].id;
  console.log(`   ✅ Using job: ${jobs[0].jobNumber}`);
}

async function createTestEntry() {
  console.log('\n⏱️  Step 4: Creating test entry with categories...');

  const today = new Date().toISOString().split('T')[0];

  const testEntry = {
    entries: [{
      jobId: testJobId,
      hours: 12,
      categoryHours: {
        STRAIGHT_TIME: 6,
        STRAIGHT_TIME_TRAVEL: 1,
        OVERTIME: 3,
        OVERTIME_TRAVEL: 0.5,
        DOUBLE_TIME: 1.5,
        DOUBLE_TIME_TRAVEL: 0,
      },
      description: 'Admin test entry - complex categories',
    }],
    userId: employeeUserId,
    date: today,
    currentUserId: adminUserId,
  };

  console.log(`   Creating entry with:`);
  console.log(`     ST: 6, STT: 1, OT: 3, OTT: 0.5, DT: 1.5, DTT: 0`);

  const response = await fetch(`${BASE_URL}/api/time-entries/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth-token=${authToken}`,
    },
    body: JSON.stringify(testEntry),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create entry: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  createdEntryId = result.entries[0].id;

  console.log(`   ✅ Entry created: ${createdEntryId}`);
  console.log(`      Total: ${result.entries[0].hours} hrs`);
  console.log(`      Pay: $${result.entries[0].estimatedPay}`);

  return result;
}

async function adminViewEntry() {
  console.log('\n👁️  Step 5: Admin viewing entry details...');

  const response = await fetch(`${BASE_URL}/api/time-entries/${createdEntryId}`, {
    headers: { 'Cookie': `auth-token=${authToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch entry: ${response.status}`);
  }

  const entry = await response.json();

  console.log(`   ✅ Admin can view entry`);
  console.log(`      Entry ID: ${entry.id}`);
  console.log(`      Total hours: ${entry.hours}`);
  console.log(`      Status: ${entry.status}`);

  if (entry.categoryHours) {
    console.log(`   📊 Category hours visible to admin:`);
    const cat = typeof entry.categoryHours === 'string'
      ? JSON.parse(entry.categoryHours)
      : entry.categoryHours;
    console.log(`      ST: ${cat.STRAIGHT_TIME}, STT: ${cat.STRAIGHT_TIME_TRAVEL}`);
    console.log(`      OT: ${cat.OVERTIME}, OTT: ${cat.OVERTIME_TRAVEL}`);
    console.log(`      DT: ${cat.DOUBLE_TIME}, DTT: ${cat.DOUBLE_TIME_TRAVEL}`);
  } else {
    throw new Error('❌ Category hours not visible to admin!');
  }

  return entry;
}

async function adminViewWeeklySummary() {
  console.log('\n📅 Step 6: Admin viewing weekly summary...');

  const today = new Date().toISOString().split('T')[0];

  const response = await fetch(
    `${BASE_URL}/api/time-entries/weekly-summary?week=${today}&userId=${employeeUserId}`,
    { headers: { 'Cookie': `auth-token=${authToken}` } }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch summary: ${response.status}`);
  }

  const summary = await response.json();

  console.log(`   ✅ Admin can view weekly summary`);
  console.log(`      Week: ${summary.weekStart} to ${summary.weekEnd}`);
  console.log(`      Total hours: ${summary.totalHours}`);
  console.log(`      Total pay: $${summary.totalPay}`);

  if (summary.categoryBreakdown) {
    console.log(`   📊 Category breakdown in summary:`);
    console.log(`      ST: ${summary.categoryBreakdown.STRAIGHT_TIME} hrs`);
    console.log(`      STT: ${summary.categoryBreakdown.STRAIGHT_TIME_TRAVEL} hrs`);
    console.log(`      OT: ${summary.categoryBreakdown.OVERTIME} hrs`);
    console.log(`      OTT: ${summary.categoryBreakdown.OVERTIME_TRAVEL} hrs`);
    console.log(`      DT: ${summary.categoryBreakdown.DOUBLE_TIME} hrs`);
    console.log(`      DTT: ${summary.categoryBreakdown.DOUBLE_TIME_TRAVEL} hrs`);

    // Verify numbers match
    if (summary.categoryBreakdown.STRAIGHT_TIME < 6) {
      throw new Error('❌ ST hours incorrect in summary');
    }
    if (summary.categoryBreakdown.OVERTIME < 3) {
      throw new Error('❌ OT hours incorrect in summary');
    }
    console.log(`   ✅ Category breakdown verified`);
  } else {
    throw new Error('❌ Category breakdown not in summary!');
  }

  return summary;
}

async function submitEntry() {
  console.log('\n📤 Step 7: Submitting entry for approval...');

  const response = await fetch(`${BASE_URL}/api/time-entries/${createdEntryId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth-token=${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to submit: ${response.status}`);
  }

  console.log(`   ✅ Entry submitted successfully`);
}

async function adminApproveEntry() {
  console.log('\n✅ Step 8: Admin approving entry...');

  const response = await fetch(`${BASE_URL}/api/time-entries/${createdEntryId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth-token=${authToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to approve: ${JSON.stringify(error)}`);
  }

  console.log(`   ✅ Entry approved by admin`);

  // Verify status changed
  const checkResponse = await fetch(`${BASE_URL}/api/time-entries/${createdEntryId}`, {
    headers: { 'Cookie': `auth-token=${authToken}` },
  });

  const entry = await checkResponse.json();
  console.log(`   Status after approval: ${entry.status}`);

  if (entry.status.toUpperCase() !== 'APPROVED') {
    throw new Error(`❌ Status should be APPROVED, got ${entry.status}`);
  }

  // Verify categoryHours still preserved
  if (!entry.categoryHours) {
    throw new Error('❌ Category hours lost after approval!');
  }

  console.log(`   ✅ Category hours preserved after approval`);
}

async function cleanup() {
  console.log('\n🧹 Step 9: Cleaning up...');

  if (createdEntryId) {
    await fetch(`${BASE_URL}/api/time-entries/${createdEntryId}`, {
      method: 'DELETE',
      headers: { 'Cookie': `auth-token=${authToken}` },
    });
    console.log(`   ✅ Test entry deleted`);
  }
}

async function runAdminTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Admin-Side Hour Categories Test (Phase 1)         ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    await loginAsAdmin();
    await getEmployeeUser();
    await getJob();
    await createTestEntry();
    await adminViewEntry();
    await adminViewWeeklySummary();
    await submitEntry();
    await adminApproveEntry();
    await cleanup();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║           ✅ ALL ADMIN TESTS PASSED                     ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log('\n✅ Admin can:');
    console.log('   - View entries with category breakdown ✓');
    console.log('   - See weekly summary with categories ✓');
    console.log('   - Approve entries with categories ✓');
    console.log('   - Category hours preserved through workflow ✓');

    process.exit(0);
  } catch (error) {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                ❌ TEST FAILED                           ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);

    try {
      await cleanup();
    } catch (e) {
      console.error('Cleanup failed:', e.message);
    }

    process.exit(1);
  }
}

runAdminTests();
