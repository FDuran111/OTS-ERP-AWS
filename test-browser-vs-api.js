#!/usr/bin/env node

/**
 * Test browser-like navigation vs API calls to identify auth header inconsistencies
 */

const baseUrl = 'http://localhost:5000';
const testUser = { email: 'admin@admin.com', password: 'OTS123' };

async function testBrowserVsAPI() {
  console.log('=== Browser Navigation vs API Calls Test ===\n');

  // Login first
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(testUser),
  });

  if (!loginResponse.ok) {
    console.log('❌ Login failed, cannot proceed');
    return;
  }

  const { token } = await loginResponse.json();
  console.log('🔑 Logged in successfully\n');

  // Test 1: Simulate auth hook behavior (no Authorization header)
  console.log('1. Testing auth hook behavior (useAuth.tsx lines 66, 155)...');
  try {
    const response = await fetch(`${baseUrl}/api/auth/me`);
    console.log(`   fetch('/api/auth/me'): ${response.status} ${response.ok ? '✅' : '❌'}`);
    if (!response.ok) {
      const error = await response.text();
      console.log(`   Error: ${error}`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 2: Simulate proper API call (with Authorization header)
  console.log('\n2. Testing proper API call (with Authorization header)...');
  try {
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`   fetch('/api/auth/me', {headers: {Authorization: ...}}): ${response.status} ${response.ok ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 3: Test different API endpoints that components commonly call
  console.log('\n3. Testing common API endpoints without Authorization headers...');
  const commonEndpoints = [
    '/api/auth/me',
    '/api/users', 
    '/api/dashboard/stats',
    '/api/jobs',
    '/api/materials',
    '/api/time-entries'
  ];

  for (const endpoint of commonEndpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        credentials: 'include' // Simulating component behavior
      });
      console.log(`   ${endpoint}: ${response.status} ${response.ok ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   ${endpoint}: Error - ${error.message}`);
    }
  }

  // Test 4: Same endpoints WITH Authorization headers
  console.log('\n4. Testing same endpoints WITH Authorization headers...');
  for (const endpoint of commonEndpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      console.log(`   ${endpoint}: ${response.status} ${response.ok ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   ${endpoint}: Error - ${error.message}`);
    }
  }

  // Test 5: Test how login page handles auth check (which works)
  console.log('\n5. Testing login page auth check pattern...');
  try {
    // Simulate login page checkAuth (line 45 in login/page.tsx)
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${token}` }  // Login page explicitly adds this
    });
    console.log(`   Login page pattern: ${response.status} ${response.ok ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 6: Test logout calls (which use POST)
  console.log('\n6. Testing logout calls...');
  try {
    const response = await fetch(`${baseUrl}/api/auth/logout`, { 
      method: 'POST',
      credentials: 'include' // No Authorization header (like components do)
    });
    console.log(`   Logout without header: ${response.status} ${response.ok ? '✅' : '❌'}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }

  // Test 7: Test with different User-Agent to simulate browser vs server
  console.log('\n7. Testing different User-Agent headers...');
  const userAgents = [
    'Mozilla/5.0 (Browser Simulation)',
    'node',
    'Next.js SSR',
    undefined
  ];

  for (const ua of userAgents) {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      if (ua) headers['User-Agent'] = ua;
      
      const response = await fetch(`${baseUrl}/api/auth/me`, { headers });
      console.log(`   User-Agent: ${ua || 'default'} -> ${response.status} ${response.ok ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   User-Agent: ${ua || 'default'} -> Error: ${error.message}`);
    }
  }
}

testBrowserVsAPI().catch(console.error);