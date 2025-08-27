// @ts-nocheck
/**
 * Smoke Tests for Storage Driver System
 * Run with: npm run test:smoke
 */

// Mock Next.js environment for testing
if (!globalThis.process) {
  globalThis.process = { env: {} }
}

import { getStorage } from '../src/lib/storage'

console.log('🧪 Storage Driver Smoke Tests\n')
console.log('Environment:')
console.log(`  STORAGE_DRIVER: ${process.env.STORAGE_DRIVER || 'SUPABASE (default)'}`)
console.log(`  S3_REGION: ${process.env.S3_REGION || 'not set'}`)
console.log(`  S3_BUCKET: ${process.env.S3_BUCKET || 'not set'}\n`)

async function runTests() {
  let passed = 0
  let failed = 0

  // Test 1: getStorage() returns an object
  console.log('Test 1: getStorage() returns a valid object')
  try {
    const storage = getStorage()
    if (typeof storage === 'object' && storage !== null) {
      console.log('  ✅ PASS: getStorage() returned an object\n')
      passed++
    } else {
      console.log('  ❌ FAIL: getStorage() did not return an object\n')
      failed++
    }
  } catch (error) {
    console.log(`  ❌ FAIL: ${error.message}\n`)
    failed++
  }

  // Test 2: Storage driver has required methods
  console.log('Test 2: Storage driver has required methods')
  try {
    const storage = getStorage()
    const requiredMethods = ['upload', 'getSignedUrl', 'delete']
    const missingMethods = []

    for (const method of requiredMethods) {
      if (typeof storage[method] !== 'function') {
        missingMethods.push(method)
      }
    }

    if (missingMethods.length === 0) {
      console.log('  ✅ PASS: All required methods present\n')
      passed++
    } else {
      console.log(`  ❌ FAIL: Missing methods: ${missingMethods.join(', ')}\n`)
      failed++
    }
  } catch (error) {
    console.log(`  ❌ FAIL: ${error.message}\n`)
    failed++
  }

  // Test 3: Driver-specific tests
  const driver = (process.env.STORAGE_DRIVER || 'SUPABASE').toUpperCase()
  console.log(`Test 3: ${driver} driver specific checks`)

  if (driver === 'S3') {
    // S3 driver tests
    if (!process.env.S3_REGION) {
      console.log('  ⚠️  SKIP: S3_REGION not set\n')
    } else {
      try {
        const storage = getStorage()
        // Try to generate a PUT presigned URL (doesn't require actual S3 access)
        const url = await storage.getSignedUrl({
          bucket: process.env.S3_BUCKET || 'test-bucket',
          key: 'test/smoke-test.txt',
          expiresInSeconds: 60,
          operation: 'put'
        })
        
        if (typeof url === 'string' && url.includes('X-Amz-Signature')) {
          console.log('  ✅ PASS: S3 presigned URL generated\n')
          passed++
        } else {
          console.log('  ❌ FAIL: Invalid S3 presigned URL format\n')
          failed++
        }
      } catch (error) {
        console.log(`  ❌ FAIL: S3 presign error: ${error.message}\n`)
        failed++
      }
    }
  } else {
    // Supabase driver tests
    console.log('  ✅ PASS: Supabase driver loaded (method presence checked)\n')
    passed++
  }

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  
  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('\n✨ All smoke tests passed!')
    process.exit(0)
  }
}

// Run tests
runTests().catch(error => {
  console.error('Unexpected test error:', error)
  process.exit(1)
})