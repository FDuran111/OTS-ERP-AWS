// Test script to verify connection from GitHub Pages to ERP
// Run this in browser console at: https://111-consulting-group.github.io/ots-website/

// Test 1: Check if ERP is accessible and CORS is working
async function testConnection() {
  console.log('🔍 Testing connection to ERP system...');

  try {
    const response = await fetch('http://ots-erp-alb-1229912979.us-east-2.elb.amazonaws.com/api/public/analytics', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://111-consulting-group.github.io',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-api-key'
      }
    });

    if (response.ok) {
      console.log('✅ CORS preflight successful');
      return true;
    } else {
      console.error('❌ CORS preflight failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return false;
  }
}

// Test 2: Send a test page view
async function testPageView() {
  console.log('📊 Sending test page view...');

  try {
    const response = await fetch('http://ots-erp-alb-1229912979.us-east-2.elb.amazonaws.com/api/public/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'ots-website-2024-prod'
      },
      body: JSON.stringify({
        pageUrl: window.location.href,
        pageTitle: 'Test Page View from GitHub Pages',
        visitorId: 'test-visitor-github-pages',
        sessionId: 'test-session-001',
        eventType: 'page_view',
        eventData: {
          test: true,
          timestamp: new Date().toISOString()
        }
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Page view tracked successfully:', data);
      return true;
    } else {
      console.error('❌ Page view tracking failed:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Analytics request failed:', error);
    return false;
  }
}

// Test 3: Submit a test lead
async function testFormSubmission() {
  console.log('📝 Submitting test lead...');

  try {
    const response = await fetch('http://ots-erp-alb-1229912979.us-east-2.elb.amazonaws.com/api/public/forms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'ots-website-2024-prod'
      },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@github-pages.com',
        phone: '555-TEST-001',
        serviceType: 'test-integration',
        urgency: 'LOW',
        description: 'This is a test submission from GitHub Pages to verify the integration is working correctly.',
        formId: 'github-pages-test',
        pageUrl: window.location.href,
        referrer: 'test-script'
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Test lead created successfully!');
      console.log('   Lead ID:', data.leadId);
      console.log('   Message:', data.message);
      console.log('   Response Time:', data.estimatedResponseTime);
      return true;
    } else {
      console.error('❌ Form submission failed:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ Form submission request failed:', error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting ERP Integration Tests from GitHub Pages');
  console.log('================================================');

  const tests = {
    connection: await testConnection(),
    pageView: await testPageView(),
    formSubmission: await testFormSubmission()
  };

  console.log('');
  console.log('📊 Test Results Summary:');
  console.log('------------------------');
  console.log(`Connection Test: ${tests.connection ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Page View Tracking: ${tests.pageView ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Form Submission: ${tests.formSubmission ? '✅ PASSED' : '❌ FAILED'}`);

  if (Object.values(tests).every(t => t)) {
    console.log('');
    console.log('🎉 All tests passed! The integration is working correctly.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Add the erp-integration.js script to your website');
    console.log('2. Update the script with production URL');
    console.log('3. Deploy the updated ERP with new CORS settings');
  } else {
    console.log('');
    console.log('⚠️ Some tests failed. Please check:');
    console.log('1. Is the ERP system deployed and running?');
    console.log('2. Are the CORS settings deployed to production?');
    console.log('3. Is the API key correct?');
  }
}

// Run the tests
runAllTests();