async function testAuth() {
  try {
    // Import the authentication function
    const { authenticateCustomerPortalUser } = require('./src/lib/customer-auth.ts');
    
    console.log('Testing direct authentication...');
    
    const result = await authenticateCustomerPortalUser(
      'john@acmeconstruction.com',
      'SecurePass123',
      '127.0.0.1',
      'test-agent'
    );
    
    console.log('✅ Authentication successful!');
    console.log('User:', result.user);
    console.log('Token length:', result.token.length);
    
  } catch (error) {
    console.log('❌ Authentication failed:', error.message);
    console.log('Error details:', error);
  }
}

testAuth();