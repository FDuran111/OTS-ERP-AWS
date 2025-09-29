#!/usr/bin/env node

/**
 * Test script to debug authentication flow inconsistencies
 */

const baseUrl = 'http://localhost:5000';

// Test data - using the same credentials from logs
const testUser = {
  email: 'admin@admin.com',
  password: 'OTS123' // Found from codebase search
};

/**
 * Test different authentication scenarios
 */
async function testAuthenticationFlow() {
  console.log('=== Authentication Flow Testing ===\n');

  try {
    // Test 1: Login and get token
    console.log('1. Testing login flow...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify(testUser),
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.text();
      console.log('❌ Login failed:', loginResponse.status, errorData);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    console.log('   - User:', loginData.user?.email);
    console.log('   - Token received:', !!loginData.token);
    console.log('   - Token preview:', loginData.token?.substring(0, 20) + '...');

    const token = loginData.token;

    // Test 2: Auth check with cookies only (simulating browser navigation)
    console.log('\n2. Testing auth check with cookies only...');
    const authCookieResponse = await fetch(`${baseUrl}/api/auth/me`, {
      credentials: 'include', // Only cookies, no Authorization header
    });
    
    console.log('   - Status:', authCookieResponse.status);
    if (authCookieResponse.ok) {
      const userData = await authCookieResponse.json();
      console.log('   ✅ Cookie auth successful for:', userData.email);
    } else {
      console.log('   ❌ Cookie auth failed');
    }

    // Test 3: Auth check with Authorization header only
    console.log('\n3. Testing auth check with Authorization header only...');
    const authHeaderResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      // No credentials: 'include' - testing header-only auth
    });

    console.log('   - Status:', authHeaderResponse.status);
    if (authHeaderResponse.ok) {
      const userData = await authHeaderResponse.json();
      console.log('   ✅ Header auth successful for:', userData.email);
    } else {
      console.log('   ❌ Header auth failed');
    }

    // Test 4: Auth check with both cookies and Authorization header
    console.log('\n4. Testing auth check with both cookies and header...');
    const authBothResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include', // Both cookies and header
    });

    console.log('   - Status:', authBothResponse.status);
    if (authBothResponse.ok) {
      const userData = await authBothResponse.json();
      console.log('   ✅ Combined auth successful for:', userData.email);
    } else {
      console.log('   ❌ Combined auth failed');
    }

    // Test 5: Multiple consecutive requests to simulate real usage
    console.log('\n5. Testing multiple consecutive requests...');
    for (let i = 1; i <= 5; i++) {
      const response = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });
      console.log(`   Request ${i}: ${response.status} ${response.ok ? '✅' : '❌'}`);
    }

    // Test 6: Test different endpoints to see header consistency
    console.log('\n6. Testing different API endpoints...');
    const endpoints = ['/api/dashboard/stats', '/api/users', '/api/jobs'];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
        });
        console.log(`   ${endpoint}: ${response.status} ${response.ok ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`   ${endpoint}: Error - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
testAuthenticationFlow().catch(console.error);