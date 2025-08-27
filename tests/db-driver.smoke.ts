// @ts-nocheck
/**
 * Smoke Tests for Database Driver System
 * Run with: npm run test:smoke:db
 */

console.log('🧪 Database Driver Smoke Tests\n')

// Test 1: SUPABASE driver configuration
console.log('Test 1: SUPABASE driver configuration')
process.env.DB_DRIVER = 'SUPABASE'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'

try {
  // Clear module cache to reload with new env
  delete require.cache[require.resolve('../src/lib/db')]
  
  // Import db module - note: this won't actually connect
  const { healthCheck } = require('../src/lib/db')
  
  console.log('  ✅ PASS: SUPABASE driver loaded successfully')
  console.log(`  Driver: ${process.env.DB_DRIVER}`)
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}\n`)
} catch (error) {
  console.log(`  ❌ FAIL: ${error.message}\n`)
}

// Test 2: RDS driver configuration
console.log('Test 2: RDS driver configuration')
process.env.DB_DRIVER = 'RDS'
process.env.RDS_PROXY_ENDPOINT = 'proxy.rds.amazonaws.com'
process.env.RDS_DB = 'ortmeier'
process.env.RDS_USER = 'admin'
process.env.RDS_PASSWORD = 'password'

try {
  // Clear module cache to reload with new env
  delete require.cache[require.resolve('../src/lib/db')]
  
  // Import db module
  const dbModule = require('../src/lib/db')
  const { pool, healthCheck } = dbModule
  
  // Check pool configuration (without connecting)
  const poolConfig = pool.options
  
  console.log('  ✅ PASS: RDS driver loaded successfully')
  console.log(`  Driver: ${process.env.DB_DRIVER}`)
  console.log(`  Host: ${poolConfig.host}`)
  console.log(`  Database: ${poolConfig.database}`)
  console.log(`  SSL: ${poolConfig.ssl ? 'Enabled' : 'Disabled'}`)
  console.log(`  Max connections: ${poolConfig.max}`)
  console.log(`  Idle timeout: ${poolConfig.idleTimeoutMillis}ms`)
  console.log(`  Connection timeout: ${poolConfig.connectionTimeoutMillis}ms\n`)
  
  // Verify expected values
  const assertions = [
    { name: 'Host matches', expected: 'proxy.rds.amazonaws.com', actual: poolConfig.host },
    { name: 'Database matches', expected: 'ortmeier', actual: poolConfig.database },
    { name: 'Max connections', expected: 10, actual: poolConfig.max },
    { name: 'Idle timeout', expected: 10000, actual: poolConfig.idleTimeoutMillis },
    { name: 'Connection timeout', expected: 5000, actual: poolConfig.connectionTimeoutMillis }
  ]
  
  let allPassed = true
  for (const assertion of assertions) {
    if (assertion.expected === assertion.actual) {
      console.log(`    ✓ ${assertion.name}: ${assertion.actual}`)
    } else {
      console.log(`    ✗ ${assertion.name}: expected ${assertion.expected}, got ${assertion.actual}`)
      allPassed = false
    }
  }
  
  if (allPassed) {
    console.log('\n  ✅ All RDS configuration assertions passed')
  } else {
    console.log('\n  ⚠️ Some RDS configuration assertions failed')
  }
  
} catch (error) {
  console.log(`  ❌ FAIL: ${error.message}\n`)
}

// Test 3: Health check function exists
console.log('\nTest 3: Health check function availability')
try {
  delete require.cache[require.resolve('../src/lib/db')]
  const { healthCheck } = require('../src/lib/db')
  
  if (typeof healthCheck === 'function') {
    console.log('  ✅ PASS: healthCheck function is available')
    
    // Test the function signature (won't actually connect)
    console.log('  Note: Not testing actual DB connection (would require live database)')
  } else {
    console.log('  ❌ FAIL: healthCheck is not a function')
  }
} catch (error) {
  console.log(`  ❌ FAIL: ${error.message}`)
}

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('✨ Database driver smoke tests completed')
console.log('Note: These tests verify configuration only, not actual connections')

// Clean up environment
delete process.env.DB_DRIVER
delete process.env.RDS_PROXY_ENDPOINT
delete process.env.RDS_DB
delete process.env.RDS_USER
delete process.env.RDS_PASSWORD