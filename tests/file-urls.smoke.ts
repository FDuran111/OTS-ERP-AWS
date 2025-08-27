// @ts-nocheck
/**
 * Smoke Tests for File URL Generation
 * Run with: npm run test:smoke:urls
 */

console.log('🧪 File URLs Smoke Tests\n')
console.log('Environment:')
console.log(`  STORAGE_DRIVER: ${process.env.STORAGE_DRIVER || 'SUPABASE (default)'}`)
console.log(`  S3_CLOUDFRONT_URL: ${process.env.S3_CLOUDFRONT_URL || 'not set'}`)
console.log(`  S3_BUCKET: ${process.env.S3_BUCKET || 'not set'}\n`)

// Mock the storage adapter to avoid actual network calls
const mockStorage = {
  getSignedUrl: async ({ bucket, key, expiresInSeconds, operation }) => {
    const driver = (process.env.STORAGE_DRIVER || 'SUPABASE').toUpperCase()
    
    if (driver === 'S3') {
      // Simulate S3 presigned URL format
      const baseUrl = `https://s3.amazonaws.com/${bucket}/${key}`
      const queryParams = [
        `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
        `X-Amz-Credential=mock-credential`,
        `X-Amz-Date=${new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '')}`,
        `X-Amz-Expires=${expiresInSeconds || 3600}`,
        `X-Amz-SignedHeaders=host`,
        `X-Amz-Signature=mock-signature`
      ]
      return `${baseUrl}?${queryParams.join('&')}`
    } else {
      // Simulate Supabase signed URL format
      const baseUrl = `https://example.supabase.co/storage/v1/object/sign/${bucket}/${key}`
      return `${baseUrl}?token=mock-token&expires=${expiresInSeconds || 3600}`
    }
  }
}

// Mock getStorage to return our mock
jest.mock('@/lib/storage', () => ({
  getStorage: () => mockStorage
}))

async function runTests() {
  let passed = 0
  let failed = 0

  // Import the module (with mocked storage)
  const { urlFor } = require('../src/lib/file-urls')
  const { bucketFor } = require('../src/lib/file-keys')

  // Test 1: CloudFront URL generation (S3 + CloudFront)
  console.log('Test 1: CloudFront URL generation')
  const originalCF = process.env.S3_CLOUDFRONT_URL
  const originalDriver = process.env.STORAGE_DRIVER
  
  process.env.STORAGE_DRIVER = 'S3'
  process.env.S3_CLOUDFRONT_URL = 'https://cdn.example.com'
  
  try {
    // Clear module cache to reload with new env
    delete require.cache[require.resolve('../src/lib/file-urls')]
    const { urlFor: urlForCF } = require('../src/lib/file-urls')
    
    const url = await urlForCF('jobs', 'project-123/invoice.pdf')
    
    if (url === 'https://cdn.example.com/uploads/project-123/invoice.pdf') {
      console.log('  ✅ PASS: CloudFront URL generated correctly')
      console.log(`     URL: ${url}`)
      passed++
    } else {
      console.log('  ❌ FAIL: CloudFront URL incorrect')
      console.log(`     Expected: https://cdn.example.com/uploads/project-123/invoice.pdf`)
      console.log(`     Got: ${url}`)
      failed++
    }
  } catch (error) {
    console.log(`  ❌ FAIL: ${error.message}`)
    failed++
  }
  
  // Test 2: S3 Presigned URL (S3 without CloudFront)
  console.log('\nTest 2: S3 Presigned URL generation')
  process.env.STORAGE_DRIVER = 'S3'
  delete process.env.S3_CLOUDFRONT_URL
  
  try {
    // Clear module cache
    delete require.cache[require.resolve('../src/lib/file-urls')]
    delete require.cache[require.resolve('../src/lib/storage')]
    
    // Re-mock storage
    jest.resetModules()
    jest.mock('../src/lib/storage', () => ({
      getStorage: () => mockStorage
    }))
    
    const { urlFor: urlForS3 } = require('../src/lib/file-urls')
    
    const url = await urlForS3('materials', 'spec-sheet.pdf', { expiresInSeconds: 7200 })
    
    if (url.includes('X-Amz-Signature')) {
      console.log('  ✅ PASS: S3 presigned URL generated')
      console.log(`     Contains signature: ${url.includes('X-Amz-Signature')}`)
      console.log(`     Contains expiry: ${url.includes('X-Amz-Expires')}`)
      passed++
    } else {
      console.log('  ❌ FAIL: Not a valid S3 presigned URL format')
      console.log(`     URL: ${url}`)
      failed++
    }
  } catch (error) {
    console.log(`  ❌ FAIL: ${error.message}`)
    failed++
  }
  
  // Test 3: Supabase URL generation
  console.log('\nTest 3: Supabase URL generation')
  process.env.STORAGE_DRIVER = 'SUPABASE'
  delete process.env.S3_CLOUDFRONT_URL
  
  try {
    // Clear module cache
    delete require.cache[require.resolve('../src/lib/file-urls')]
    delete require.cache[require.resolve('../src/lib/storage')]
    
    // Re-mock storage
    jest.resetModules()
    jest.mock('../src/lib/storage', () => ({
      getStorage: () => mockStorage
    }))
    
    const { urlFor: urlForSupabase } = require('../src/lib/file-urls')
    
    const url = await urlForSupabase('customers', 'contract.pdf')
    
    if (typeof url === 'string' && url.length > 0) {
      console.log('  ✅ PASS: Supabase URL generated')
      console.log(`     URL type: ${typeof url}`)
      console.log(`     URL not empty: ${url.length > 0}`)
      passed++
    } else {
      console.log('  ❌ FAIL: Invalid Supabase URL')
      console.log(`     URL: ${url}`)
      failed++
    }
  } catch (error) {
    console.log(`  ❌ FAIL: ${error.message}`)
    failed++
  }
  
  // Test 4: Force signed URL even with CloudFront
  console.log('\nTest 4: Force signed URL with CloudFront available')
  process.env.STORAGE_DRIVER = 'S3'
  process.env.S3_CLOUDFRONT_URL = 'https://cdn.example.com'
  
  try {
    // Clear module cache
    delete require.cache[require.resolve('../src/lib/file-urls')]
    delete require.cache[require.resolve('../src/lib/storage')]
    
    // Re-mock storage
    jest.resetModules()
    jest.mock('../src/lib/storage', () => ({
      getStorage: () => mockStorage
    }))
    
    const { urlFor: urlForForced } = require('../src/lib/file-urls')
    
    const url = await urlForForced('documents', 'confidential.pdf', { forceSigned: true })
    
    if (url.includes('X-Amz-Signature')) {
      console.log('  ✅ PASS: Forced signed URL generated despite CloudFront')
      console.log(`     Is presigned: ${url.includes('X-Amz-Signature')}`)
      passed++
    } else {
      console.log('  ❌ FAIL: Should have generated signed URL')
      console.log(`     URL: ${url}`)
      failed++
    }
  } catch (error) {
    console.log(`  ❌ FAIL: ${error.message}`)
    failed++
  }

  // Restore environment
  if (originalCF) {
    process.env.S3_CLOUDFRONT_URL = originalCF
  } else {
    delete process.env.S3_CLOUDFRONT_URL
  }
  
  if (originalDriver) {
    process.env.STORAGE_DRIVER = originalDriver
  } else {
    delete process.env.STORAGE_DRIVER
  }

  // Summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Results: ${passed} passed, ${failed} failed`)
  
  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('\n✨ All file URL tests passed!')
    process.exit(0)
  }
}

// Check if jest is available, otherwise use simple implementation
if (typeof jest === 'undefined') {
  // Simple mock implementation without jest
  global.jest = {
    mock: () => {},
    resetModules: () => {}
  }
  
  // Override require to inject mock
  const Module = require('module')
  const originalRequire = Module.prototype.require
  
  Module.prototype.require = function(id) {
    if (id === '@/lib/storage' || id === '../src/lib/storage') {
      return { getStorage: () => mockStorage }
    }
    return originalRequire.apply(this, arguments)
  }
}

// Run tests
runTests().catch(console.error)