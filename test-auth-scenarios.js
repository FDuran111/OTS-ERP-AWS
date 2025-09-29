#!/usr/bin/env node

/**
 * Test different authentication scenarios to identify inconsistencies
 */

const baseUrl = 'http://localhost:5000';
const testUser = { email: 'admin@admin.com', password: 'OTS123' };

async function testAuthScenarios() {
  console.log('=== Testing Authentication Scenarios ===\n');

  // First, login to get a token
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(testUser),
  });

  if (!loginResponse.ok) {
    console.log('❌ Cannot proceed - login failed');
    return;
  }

  const { token } = await loginResponse.json();
  console.log('🔑 Token obtained for testing\n');

  // Scenario 1: Test cookie persistence across requests
  console.log('1. Testing cookie persistence...');
  try {
    const response1 = await fetch(`${baseUrl}/api/auth/me`, { credentials: 'include' });
    const response2 = await fetch(`${baseUrl}/api/auth/me`, { credentials: 'include' });
    console.log(`   First request: ${response1.status}`);
    console.log(`   Second request: ${response2.status}`);
    console.log(`   ❌ Cookies are not persisting across requests (both failed)\n`);
  } catch (error) {
    console.log(`   Error: ${error.message}\n`);
  }

  // Scenario 2: Test different request methods
  console.log('2. Testing different HTTP methods with headers...');
  const methods = ['GET', 'POST', 'PUT', 'DELETE'];
  for (const method of methods) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
      });
      console.log(`   ${method}: ${response.status} ${response.ok ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   ${method}: Error - ${error.message}`);
    }
  }
  console.log();

  // Scenario 3: Test request with and without credentials
  console.log('3. Testing credentials settings...');
  const credentialsOptions = ['omit', 'same-origin', 'include'];
  for (const cred of credentialsOptions) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: cred,
      });
      console.log(`   credentials: ${cred} -> ${response.status} ${response.ok ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   credentials: ${cred} -> Error: ${error.message}`);
    }
  }
  console.log();

  // Scenario 4: Test different content types
  console.log('4. Testing different content types...');
  const contentTypes = [
    'application/json',
    'application/x-www-form-urlencoded', 
    'multipart/form-data',
    undefined
  ];
  for (const contentType of contentTypes) {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      if (contentType) headers['Content-Type'] = contentType;
      
      const response = await fetch(`${baseUrl}/api/auth/me`, { headers });
      console.log(`   Content-Type: ${contentType || 'none'} -> ${response.status} ${response.ok ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   Content-Type: ${contentType || 'none'} -> Error: ${error.message}`);
    }
  }
  console.log();

  // Scenario 5: Test rapid successive requests
  console.log('5. Testing rapid successive requests...');
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
    );
  }
  
  try {
    const responses = await Promise.all(promises);
    const results = responses.map((r, i) => `${i+1}:${r.status}`);
    console.log(`   Results: ${results.join(' ')}`);
    const successful = responses.filter(r => r.ok).length;
    console.log(`   Success rate: ${successful}/10 ${successful === 10 ? '✅' : '❌'}\n`);
  } catch (error) {
    console.log(`   Error in rapid requests: ${error.message}\n`);
  }

  // Scenario 6: Test browser-like navigation requests
  console.log('6. Testing browser-like navigation...');
  try {
    // Simulate what happens during page navigation
    const navResponse = await fetch(`${baseUrl}/dashboard`, {
      credentials: 'include',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'User-Agent': 'Mozilla/5.0 (Test) Browser Navigation Test'
      }
    });
    console.log(`   Dashboard navigation: ${navResponse.status} ${navResponse.ok ? '✅' : '❌'}`);
    console.log(`   Redirected: ${navResponse.redirected ? 'Yes' : 'No'}`);
    console.log(`   Final URL: ${navResponse.url}`);
  } catch (error) {
    console.log(`   Navigation error: ${error.message}`);
  }
}

testAuthScenarios().catch(console.error);