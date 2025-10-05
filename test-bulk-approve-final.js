const http = require('http');

const API_URL = 'http://0.0.0.0:5000';
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'OTS123';

// These will be the actual UUIDs created in the database
const ENTRY_IDS = [
  'f9be2f85-7217-45ae-83a3-03e07c42f6b9',
  '8a1fba7b-e997-4fb6-8f3a-d0c9d8e4e49b',
  'd6b2387e-56d1-422e-81f6-99040917c4f4',
  '725c1034-7850-4839-aed7-a6d3d8dc4750',
  '3fe5090d-53bc-4d49-85b8-a7930ca1c228'
];

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
  console.log('BULK APPROVAL API TEST - FINAL');
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
    notes: 'Bulk approval test - Final'
  }, adminToken);
  const endTime = Date.now();
  
  const responseTime = (endTime - startTime) / 1000;
  
  console.log('\n========== API RESPONSE ==========');
  console.log(JSON.stringify(bulkApproveRes.data, null, 2));
  
  console.log('\n========== PERFORMANCE ==========');
  console.log(`Response time: ${responseTime.toFixed(3)}s`);
  
  if (responseTime < 3.0) {
    console.log(`✓ PASS: Response time OK (${responseTime.toFixed(3)}s < 3s)`);
  } else {
    console.log(`✗ FAIL: Response time too slow (${responseTime.toFixed(3)}s >= 3s)`);
  }
  
  console.log('\n========== RESULTS ==========');
  const approved = bulkApproveRes.data.approved || 0;
  const failed = bulkApproveRes.data.failed || 0;
  
  if (approved === ENTRY_IDS.length && failed === 0) {
    console.log(`✓ PASS: All ${ENTRY_IDS.length} entries approved successfully`);
  } else {
    console.log(`✗ FAIL: Only ${approved} of ${ENTRY_IDS.length} entries approved`);
    if (failed > 0) {
      console.log(`  Failed entries: ${failed}`);
      console.log('  Failures:', bulkApproveRes.data.failedIds);
    }
  }
  
  if (bulkApproveRes.data.approvedIds && bulkApproveRes.data.approvedIds.length === ENTRY_IDS.length) {
    console.log('✓ PASS: API response includes all approved entry IDs');
  } else {
    console.log('✗ FAIL: API response missing some approved entry IDs');
  }
  
  console.log('\n========================================');
  console.log('DATABASE VERIFICATION QUERIES');
  console.log('========================================\n');
  
  console.log('Run these SQL queries to verify:\n');
  
  console.log('1. Verify all entries have status=\'approved\':');
  console.log(`   SELECT id, status FROM "TimeEntry" WHERE id IN ('${ENTRY_IDS.join("','")}')\n`);
  
  console.log('2. Verify JobLaborCost records were created:');
  console.log(`   SELECT * FROM "JobLaborCost" WHERE "timeEntryId" IN ('${ENTRY_IDS.join("','")}')\n`);
  
  console.log('3. Verify cost calculations are correct:');
  console.log(`   SELECT 
       "timeEntryId", 
       "hoursWorked", 
       "hourlyRate", 
       "totalCost",
       ("hoursWorked" * "hourlyRate") as expected_cost,
       CASE 
         WHEN ABS("totalCost" - ("hoursWorked" * "hourlyRate")) < 0.01 THEN 'CORRECT'
         ELSE 'INCORRECT'
       END as validation
   FROM "JobLaborCost" 
   WHERE "timeEntryId" IN ('${ENTRY_IDS.join("','")}')
   ORDER BY "timeEntryId"\n`);
  
  return { 
    entryIds: ENTRY_IDS, 
    approved, 
    failed,
    responseTime,
    approvedIds: bulkApproveRes.data.approvedIds || []
  };
}

runTest()
  .then(result => {
    console.log('\n==========================================');
    console.log('TEST SUMMARY');
    console.log('==========================================');
    console.log(`Entries to approve: ${result.entryIds.length}`);
    console.log(`Successfully approved: ${result.approved}`);
    console.log(`Failed: ${result.failed}`);
    console.log(`Response time: ${result.responseTime.toFixed(3)}s`);
    console.log('==========================================\n');
    process.exit(result.approved === result.entryIds.length && result.failed === 0 ? 0 : 1);
  })
  .catch(error => {
    console.error('\n✗ Test failed with error:', error);
    process.exit(1);
  });
