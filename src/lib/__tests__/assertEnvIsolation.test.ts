import { assertEnvIsolation, getEnvIsolationStatus } from '../assertEnvIsolation'

describe('Environment Isolation Guard', () => {
  // Store original env vars
  const originalEnv = process.env
  
  beforeEach(() => {
    // Reset modules to clear any cached state
    jest.resetModules()
    // Clone the original env
    process.env = { ...originalEnv }
  })
  
  afterEach(() => {
    // Restore original env
    process.env = originalEnv
  })
  
  describe('assertEnvIsolation', () => {
    it('should not throw in development environment', () => {
      process.env.NEXT_PUBLIC_ENV = 'development'
      process.env.DATABASE_URL = 'postgresql://production-db.com/db'
      
      expect(() => assertEnvIsolation()).not.toThrow()
    })
    
    it('should not throw in production environment', () => {
      process.env.NEXT_PUBLIC_ENV = 'production'
      process.env.DATABASE_URL = 'postgresql://production-db.com/db'
      
      expect(() => assertEnvIsolation()).not.toThrow()
    })
    
    it('should throw when staging points to production database', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      process.env.DATABASE_URL = 'postgresql://production-db.com/db'
      
      expect(() => assertEnvIsolation()).toThrow('Environment isolation violation')
    })
    
    it('should throw when staging points to prod database', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      process.env.DATABASE_URL = 'postgresql://db-prod.amazonaws.com/mydb'
      
      expect(() => assertEnvIsolation()).toThrow('Environment isolation violation')
    })
    
    it('should throw when staging points to live database', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      process.env.DATABASE_URL = 'postgresql://live-database.com/db'
      
      expect(() => assertEnvIsolation()).toThrow('Environment isolation violation')
    })
    
    it('should throw when staging points to production Supabase', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://production.supabase.co'
      
      expect(() => assertEnvIsolation()).toThrow('Environment isolation violation')
    })
    
    it('should throw when staging points to production S3 bucket', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      process.env.AWS_S3_BUCKET = 'my-app-production-files'
      
      expect(() => assertEnvIsolation()).toThrow('Environment isolation violation')
    })
    
    it('should not throw when staging uses staging resources', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      process.env.DATABASE_URL = 'postgresql://staging-db.com/db'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://staging.supabase.co'
      process.env.AWS_S3_BUCKET = 'my-app-staging-files'
      
      expect(() => assertEnvIsolation()).not.toThrow()
    })
    
    it('should detect multiple violations', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      process.env.DATABASE_URL = 'postgresql://production-db.com/db'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://prod.supabase.co'
      process.env.AWS_S3_BUCKET = 'live-bucket'
      
      let errorThrown = false
      let errorMessage = ''
      
      try {
        assertEnvIsolation()
      } catch (error: any) {
        errorThrown = true
        errorMessage = error.message
      }
      
      expect(errorThrown).toBe(true)
      expect(errorMessage).toContain('Environment isolation violation')
    })
  })
  
  describe('getEnvIsolationStatus', () => {
    it('should return valid status for non-staging environments', () => {
      process.env.NEXT_PUBLIC_ENV = 'development'
      process.env.DATABASE_URL = 'postgresql://production-db.com/db'
      
      const status = getEnvIsolationStatus()
      
      expect(status.isValid).toBe(true)
      expect(status.violations).toHaveLength(0)
    })
    
    it('should detect violations in staging', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      process.env.DATABASE_URL = 'postgresql://production-db.com/db'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://prod.supabase.co'
      
      const status = getEnvIsolationStatus()
      
      expect(status.isValid).toBe(false)
      expect(status.violations).toHaveLength(2)
      expect(status.violations).toContain('DATABASE_URL contains production indicators')
      expect(status.violations).toContain('NEXT_PUBLIC_SUPABASE_URL contains production indicators')
    })
    
    it('should return valid status for properly configured staging', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      process.env.DATABASE_URL = 'postgresql://staging-db.com/db'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://staging.supabase.co'
      
      const status = getEnvIsolationStatus()
      
      expect(status.isValid).toBe(true)
      expect(status.violations).toHaveLength(0)
    })
    
    it('should check all relevant environment variables', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      process.env.DATABASE_URL = 'postgresql://prod-db.com/db'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://production.supabase.co'
      process.env.AWS_S3_BUCKET = 'prod-bucket'
      process.env.STORAGE_BUCKET = 'production-storage'
      process.env.NEXT_PUBLIC_API_URL = 'https://api.production.com'
      process.env.NEXTAUTH_URL = 'https://production.com'
      process.env.QB_REDIRECT_URI = 'https://production.com/callback'
      
      const status = getEnvIsolationStatus()
      
      expect(status.isValid).toBe(false)
      expect(status.violations).toHaveLength(7)
    })
  })
  
  describe('Production indicators detection', () => {
    it('should detect "prod" in various positions', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      
      const testCases = [
        'https://prod.example.com',
        'https://example-prod.com',
        'https://example.com/prod',
        'postgresql://prod-db.com/database',
        'PROD_BUCKET_NAME',
      ]
      
      testCases.forEach(url => {
        process.env.DATABASE_URL = url
        expect(() => assertEnvIsolation()).toThrow('Environment isolation violation')
      })
    })
    
    it('should detect "production" in various positions', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      
      const testCases = [
        'https://production.example.com',
        'https://example-production.com',
        'https://example.com/production',
        'postgresql://production-db.com/database',
        'PRODUCTION_BUCKET_NAME',
      ]
      
      testCases.forEach(url => {
        process.env.DATABASE_URL = url
        expect(() => assertEnvIsolation()).toThrow('Environment isolation violation')
      })
    })
    
    it('should detect "live" in various positions', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      
      const testCases = [
        'https://live.example.com',
        'https://example-live.com',
        'https://example.com/live',
        'postgresql://live-db.com/database',
        'LIVE_BUCKET_NAME',
      ]
      
      testCases.forEach(url => {
        process.env.DATABASE_URL = url
        expect(() => assertEnvIsolation()).toThrow('Environment isolation violation')
      })
    })
    
    it('should be case-insensitive', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      
      const testCases = [
        'https://PROD.example.com',
        'https://Production.example.com',
        'https://LIVE.example.com',
        'https://PrOdUcTiOn.example.com',
      ]
      
      testCases.forEach(url => {
        process.env.DATABASE_URL = url
        expect(() => assertEnvIsolation()).toThrow('Environment isolation violation')
      })
    })
  })
})