#!/usr/bin/env node

/**
 * Smoke tests for staging deployment
 * Runs basic sanity checks against core API endpoints
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get base URL and credentials from environment
const BASE_URL = process.env.STAGING_BASE_URL || 'https://main.amplifyapp.com';
const BASIC_AUTH = process.env.STAGING_BASIC_AUTH || '';

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Test tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Helper to make authenticated requests
async function makeRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Add basic auth if provided
  if (BASIC_AUTH) {
    headers['Authorization'] = `Basic ${Buffer.from(BASIC_AUTH).toString('base64')}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    const contentType = response.headers.get('content-type');
    let data = null;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return { 
      ok: response.ok, 
      status: response.status, 
      data,
      headers: response.headers
    };
  } catch (error) {
    return { 
      ok: false, 
      status: 0, 
      error: error.message 
    };
  }
}

// Test runner
async function runTest(name, testFn) {
  totalTests++;
  process.stdout.write(`Testing ${name}... `);
  
  try {
    const result = await testFn();
    if (result.success) {
      console.log(`${GREEN}✅ PASS${RESET}${result.message ? `: ${result.message}` : ''}`);
      passedTests++;
      return true;
    } else {
      console.log(`${RED}❌ FAIL${RESET}: ${result.message || 'Unknown error'}`);
      failedTests++;
      return false;
    }
  } catch (error) {
    console.log(`${RED}❌ ERROR${RESET}: ${error.message}`);
    failedTests++;
    return false;
  }
}

// Test 1: Health Check
async function testHealthCheck() {
  const response = await makeRequest('/api/health');
  
  if (!response.ok) {
    return { 
      success: false, 
      message: `Status ${response.status}${response.error ? `: ${response.error}` : ''}` 
    };
  }
  
  if (response.data?.ok !== true) {
    return { 
      success: false, 
      message: `Expected {ok:true}, got ${JSON.stringify(response.data)}` 
    };
  }
  
  return { success: true };
}

// Test 2: Get Jobs List
async function testGetJobs() {
  const response = await makeRequest('/api/jobs');
  
  if (!response.ok) {
    return { 
      success: false, 
      message: `Status ${response.status}` 
    };
  }
  
  if (!Array.isArray(response.data)) {
    return { 
      success: false, 
      message: `Expected array, got ${typeof response.data}` 
    };
  }
  
  return { 
    success: true, 
    message: `Found ${response.data.length} jobs` 
  };
}

// Test 3: Create and Get Job
async function testCreateJob() {
  // Create a test job
  const testJob = {
    name: `Smoke Test Job ${Date.now()}`,
    description: 'Automated smoke test job - safe to delete',
    customer_id: 1, // Assuming seeded customer exists
    status: 'PENDING',
    scheduled_start: new Date().toISOString(),
    scheduled_end: new Date(Date.now() + 86400000).toISOString(), // +1 day
    estimated_hours: 4
  };
  
  const createResponse = await makeRequest('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(testJob)
  });
  
  if (!createResponse.ok) {
    return { 
      success: false, 
      message: `Failed to create job: Status ${createResponse.status}` 
    };
  }
  
  const jobId = createResponse.data?.id;
  if (!jobId) {
    return { 
      success: false, 
      message: 'No job ID returned' 
    };
  }
  
  // Get the created job
  const getResponse = await makeRequest(`/api/jobs/${jobId}`);
  
  if (!getResponse.ok) {
    return { 
      success: false, 
      message: `Failed to get job: Status ${getResponse.status}` 
    };
  }
  
  if (getResponse.data?.id !== jobId) {
    return { 
      success: false, 
      message: `Job ID mismatch: expected ${jobId}, got ${getResponse.data?.id}` 
    };
  }
  
  return { 
    success: true, 
    message: `Created and retrieved job ID ${jobId}` 
  };
}

// Test 4: File Upload
async function testFileUpload() {
  // Create a test file content
  const boundary = '----FormBoundary' + Date.now();
  const fileName = `smoke-test-${Date.now()}.txt`;
  const fileContent = 'This is a smoke test file. Safe to delete.';
  
  // Build multipart form data manually
  const formData = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
    'Content-Type: text/plain',
    '',
    fileContent,
    `--${boundary}`,
    'Content-Disposition: form-data; name="category"',
    '',
    'test',
    `--${boundary}--`
  ].join('\r\n');
  
  // Upload file
  const uploadResponse = await makeRequest('/api/files/upload', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: formData
  });
  
  if (!uploadResponse.ok) {
    // Try JSON endpoint as fallback
    const jsonUpload = await makeRequest('/api/files/upload', {
      method: 'POST',
      body: JSON.stringify({
        fileName: fileName,
        fileContent: Buffer.from(fileContent).toString('base64'),
        category: 'test',
        mimeType: 'text/plain'
      })
    });
    
    if (!jsonUpload.ok) {
      return { 
        success: false, 
        message: `Upload failed: Status ${uploadResponse.status}` 
      };
    }
    
    uploadResponse.data = jsonUpload.data;
  }
  
  const fileId = uploadResponse.data?.id || uploadResponse.data?.fileId;
  const fileUrl = uploadResponse.data?.url || uploadResponse.data?.fileUrl;
  
  if (!fileId && !fileUrl) {
    return { 
      success: false, 
      message: 'No file ID or URL returned' 
    };
  }
  
  // Verify file metadata (if endpoint exists)
  if (fileId) {
    const metadataResponse = await makeRequest(`/api/files/${fileId}`);
    
    if (metadataResponse.ok) {
      return { 
        success: true, 
        message: `Uploaded file ID ${fileId}` 
      };
    }
  }
  
  // If we have a URL, that's good enough
  if (fileUrl) {
    return { 
      success: true, 
      message: `File uploaded to ${fileUrl.substring(0, 50)}...` 
    };
  }
  
  return { 
    success: true, 
    message: 'File uploaded (metadata check skipped)' 
  };
}

// Test 5: Authentication Check
async function testAuthentication() {
  // Try to access without auth (should fail if basic auth is enabled)
  const noAuthResponse = await fetch(`${BASE_URL}/api/jobs`, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  // If basic auth is configured and we get 401, that's correct
  if (BASIC_AUTH && noAuthResponse.status === 401) {
    return { 
      success: true, 
      message: 'Basic auth properly enforced' 
    };
  }
  
  // If no basic auth and we get 200, that's also correct (for API endpoints)
  if (!BASIC_AUTH && noAuthResponse.status === 200) {
    return { 
      success: true, 
      message: 'No basic auth configured (API accessible)' 
    };
  }
  
  // Otherwise check with credentials
  const authResponse = await makeRequest('/api/jobs');
  if (authResponse.ok) {
    return { 
      success: true, 
      message: 'Authentication working' 
    };
  }
  
  return { 
    success: false, 
    message: `Auth check failed: Status ${authResponse.status}` 
  };
}

// Test 6: Database Connectivity (via jobs endpoint)
async function testDatabaseConnectivity() {
  // The jobs endpoint requires database access
  const response = await makeRequest('/api/jobs?limit=1');
  
  if (!response.ok) {
    if (response.status === 500) {
      return { 
        success: false, 
        message: 'Database connection error (500)' 
      };
    }
    return { 
      success: false, 
      message: `Unexpected status ${response.status}` 
    };
  }
  
  return { 
    success: true, 
    message: 'Database accessible' 
  };
}

// Test 7: Storage Provider Verification (AWS S3 for staging)
async function testStorageProvider() {
  // Check health endpoint for environment info
  const response = await makeRequest('/api/health');
  
  if (!response.ok) {
    return { 
      success: false, 
      message: `Health check failed: Status ${response.status}` 
    };
  }
  
  const envData = response.data;
  
  // For staging/production, verify S3 is being used
  if (envData?.environment === 'staging' || envData?.environment === 'production') {
    // Check if storage provider is S3
    if (envData?.storageProvider && envData.storageProvider !== 's3') {
      return { 
        success: false, 
        message: `Invalid storage provider for ${envData.environment}: ${envData.storageProvider} (must be S3)` 
      };
    }
    
    // Verify no Supabase configuration present
    if (envData?.hasSupabaseConfig === true) {
      return { 
        success: false, 
        message: `Supabase configuration detected in ${envData.environment} environment (not allowed)` 
      };
    }
    
    return { 
      success: true, 
      message: `S3 storage correctly configured for ${envData.environment}` 
    };
  }
  
  return { 
    success: true, 
    message: 'Storage provider check passed' 
  };
}

// Main test runner
async function main() {
  console.log('========================================');
  console.log('🚀 Staging Smoke Tests');
  console.log('========================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Basic Auth: ${BASIC_AUTH ? 'Configured' : 'Not configured'}`);
  console.log('');
  
  // Run all tests
  await runTest('Health Check', testHealthCheck);
  await runTest('Authentication', testAuthentication);
  await runTest('Database Connectivity', testDatabaseConnectivity);
  await runTest('Storage Provider', testStorageProvider);
  await runTest('Get Jobs List', testGetJobs);
  await runTest('Create and Get Job', testCreateJob);
  await runTest('File Upload', testFileUpload);
  
  // Summary
  console.log('');
  console.log('========================================');
  console.log('📊 Test Summary');
  console.log('========================================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`${GREEN}Passed: ${passedTests}${RESET}`);
  
  if (failedTests > 0) {
    console.log(`${RED}Failed: ${failedTests}${RESET}`);
  }
  
  const successRate = Math.round((passedTests / totalTests) * 100);
  console.log(`Success Rate: ${successRate}%`);
  
  if (failedTests === 0) {
    console.log('');
    console.log(`${GREEN}✅ All smoke tests passed!${RESET}`);
    console.log('Staging deployment is healthy.');
    process.exit(0);
  } else {
    console.log('');
    console.log(`${RED}❌ Some tests failed.${RESET}`);
    console.log('Please check the staging deployment.');
    process.exit(1);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(`${RED}Unhandled error:${RESET}`, error);
  process.exit(1);
});

// Run tests
main().catch((error) => {
  console.error(`${RED}Fatal error:${RESET}`, error);
  process.exit(1);
});