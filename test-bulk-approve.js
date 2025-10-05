const http = require('http');

// Test configuration
const API_URL = 'http://0.0.0.0:5000';
const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'OTS123';
const JOB_ID = 'a13f0da8-88f2-454d-8a69-3db9b0b60bfd';
const TECH_ID = '739a33a0-a4ca-48b6-962b-2d504ab7d11d';
const EMPLOYEE_ID = 'a4b0c5ac-1249-4849-ac85-3dc9e8fd8041';

// Helper to make API requests
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
    console.error('Response:', loginRes);
    process.exit(1);
  }
  
  const adminToken = loginRes.data.token;
  console.log('✓ Admin logged in successfully\n');
  
  // Step 2: Create and submit 5 time entries
  console.log('Step 2: Creating 5 time entries...');
  const entryIds = [];
  const today = new Date().toISOString().split('T')[0];
  
  // Create 3 entries for Tech
  for (let i = 1; i <= 3; i++) {
    console.log(`Creating entry ${i} for Tech employee...`);
    const createRes = await apiRequest('/api/time-entries/direct', 'POST', {
      userId: TECH_ID,
      jobId: JOB_ID,
      date: today,
      hours: 8.0,
      description: `Test entry ${i} - Tech`
    }, adminToken);
    
    if (createRes.data.id) {
      console.log(`Created entry: ${createRes.data.id}`);
      
      // Submit the entry
      const submitRes = await apiRequest(
        `/api/time-entries/${createRes.data.id}/submit`,
        'POST',
        { submittedBy: TECH_ID },
        adminToken
      );
      
      console.log(`Submitted entry: ${createRes.data.id}`);
      entryIds.push(createRes.data.id);
    } else {
      console.error(`ERROR: Failed to create entry ${i}`);
      console.error('Response:', createRes);
    }
  }
  
  // Create 2 entries for Employee
  for (let i = 4; i <= 5; i++) {
    console.log(`Creating entry ${i} for Employee...`);
    const createRes = await apiRequest('/api/time-entries/direct', 'POST', {
      userId: EMPLOYEE_ID,
      jobId: JOB_ID,
      date: today,
      hours: 8.0,
      description: `Test entry ${i} - Employee`
    }, adminToken);
    
    if (createRes.data.id) {
      console.log(`Created entry: ${createRes.data.id}`);
      
      // Submit the entry
      const submitRes = await apiRequest(
        `/api/time-entries/${createRes.data.id}/submit`,
        'POST',
        { submittedBy: EMPLOYEE_ID },
        adminToken
      );
      
      console.log(`Submitted entry: ${createRes.data.id}`);
      entryIds.push(createRes.data.id);
    } else {
      console.error(`ERROR: Failed to create entry ${i}`);
      console.error('Response:', createRes);
    }
  }
  
  console.log(`\n✓ Created and submitted ${entryIds.length} time entries`);
  console.log('Entry IDs:', entryIds);
  
  // Step 3: Bulk approve with timing
  console.log('\nStep 3: Bulk approving all entries...');
  console.log('Approving entries:', entryIds);
  
  const startTime = Date.now();
  const bulkApproveRes = await apiRequest('/api/time-entries/bulk-approve', 'POST', {
    entryIds
  }, adminToken);
  const endTime = Date.now();
  
  const responseTime = (endTime - startTime) / 1000;
  
  console.log('\nBulk approve response:', JSON.stringify(bulkApproveRes.data, null, 2));
  console.log(`Response time: ${responseTime.toFixed(3)}s`);
  
  if (responseTime < 3.0) {
    console.log(`✓ Response time OK (${responseTime.toFixed(3)}s < 3s)`);
  } else {
    console.log(`⚠ Response time WARNING (${responseTime.toFixed(3)}s >= 3s)`);
  }
  
  if (bulkApproveRes.data.approved === entryIds.length) {
    console.log(`✓ All ${entryIds.length} entries approved successfully`);
  } else {
    console.log(`⚠ WARNING: Only ${bulkApproveRes.data.approved} of ${entryIds.length} entries approved`);
  }
  
  console.log('\n==========================================');
  console.log('API Test Completed Successfully');
  console.log('==========================================\n');
  console.log('Entry IDs for database verification:');
  entryIds.forEach(id => console.log(`  - ${id}`));
  console.log('\nNow verifying database records...\n');
  
  return { entryIds, approvedCount: bulkApproveRes.data.approved, responseTime };
}

runTest()
  .then(result => {
    console.log('\n✓ Test completed successfully');
    console.log(`Entry IDs: ${result.entryIds.join(',')}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  });
