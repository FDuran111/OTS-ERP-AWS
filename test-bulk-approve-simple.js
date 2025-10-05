const http = require('http');

const API_URL = 'http://0.0.0.0:5000';
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'OTS123';

// Test entry IDs created directly in database
const ENTRY_IDS = ['test-entry-1', 'test-entry-2', 'test-entry-3', 'test-entry-4', 'test-entry-5'];

async function apiRequest(path, method = 'GET', body = null, token = null) {
  const url = new URL(path, API_URL);
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (token) {
    options.headers['Cookie'] = `auth-token=${token}`;
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function runTest() {
  console.log('==========================================');
  console.log('Bulk Approval API Test');
  console.log('==========================================\n');
  
  // Step 1: Login
  console.log('Step 1: Logging in as admin...');
  const loginRes = await apiRequest('/api/auth/login', 'POST', {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  });
  
  if (!loginRes.data.token) {
    console.error('ERROR: Failed to login');
    process.exit(1);
  }
  
  const adminToken = loginRes.data.token;
  console.log('✓ Admin logged in successfully\n');
  
  // Step 2: Bulk approve with timing
  console.log('Step 2: Bulk approving 5 time entries...');
  console.log('Entry IDs:', ENTRY_IDS);
  
  const startTime = Date.now();
  const bulkApproveRes = await apiRequest('/api/time-entries/bulk-approve', 'POST', {
    entryIds: ENTRY_IDS,
    notes: 'Bulk approval test'
  }, adminToken);
  const endTime = Date.now();
  
  const responseTime = (endTime - startTime) / 1000;
  
  console.log('\n--- API Response ---');
  console.log(JSON.stringify(bulkApproveRes.data, null, 2));
  console.log(`\n--- Performance ---`);
  console.log(`Response time: ${responseTime.toFixed(3)}s`);
  
  if (responseTime < 3.0) {
    console.log(`✓ Response time OK (${responseTime.toFixed(3)}s < 3s)`);
  } else {
    console.log(`⚠ Response time WARNING (${responseTime.toFixed(3)}s >= 3s)`);
  }
  
  console.log(`\n--- Results ---`);
  if (bulkApproveRes.data.approved === ENTRY_IDS.length) {
    console.log(`✓ All ${ENTRY_IDS.length} entries approved successfully`);
  } else {
    console.log(`⚠ WARNING: Only ${bulkApproveRes.data.approved} of ${ENTRY_IDS.length} entries approved`);
  }
  
  if (bulkApproveRes.data.approvedIds && bulkApproveRes.data.approvedIds.length === ENTRY_IDS.length) {
    console.log('✓ API response includes all approved entry IDs');
  } else {
    console.log('⚠ API response missing some approved entry IDs');
  }
  
  console.log('\n==========================================');
  console.log('Verify Database Records');
  console.log('==========================================');
  console.log('Run these SQL queries to verify:\n');
  console.log('1. Check all entries have status=\'approved\':');
  console.log(`   SELECT id, status FROM "TimeEntry" WHERE id IN ('${ENTRY_IDS.join("','")}')\n`);
  console.log('2. Check JobLaborCost records were created:');
  console.log(`   SELECT * FROM "JobLaborCost" WHERE "timeEntryId" IN ('${ENTRY_IDS.join("','")}')\n`);
  console.log('3. Check cost calculations:');
  console.log(`   SELECT "timeEntryId", "hoursWorked", "hourlyRate", "totalCost", 
          ("hoursWorked" * "hourlyRate") as expected_cost
   FROM "JobLaborCost" 
   WHERE "timeEntryId" IN ('${ENTRY_IDS.join("','")}')\n`);
  
  return { 
    entryIds: ENTRY_IDS, 
    approved: bulkApproveRes.data.approved, 
    responseTime,
    approvedIds: bulkApproveRes.data.approvedIds || []
  };
}

runTest()
  .then(result => {
    console.log('\n✓ API Test completed');
    console.log(`Approved: ${result.approved}/${result.entryIds.length}`);
    console.log(`Response time: ${result.responseTime.toFixed(3)}s`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  });
