import { ensureKeyPrefix, removeKeyPrefix } from '../index'
import { getStorageConfig, getStoragePath, parseStoragePath } from '../config'

describe('Storage Provider', () => {
  const originalEnv = process.env
  
  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })
  
  afterEach(() => {
    process.env = originalEnv
  })
  
  describe('Key Prefix Management', () => {
    describe('ensureKeyPrefix', () => {
      it('should add prefix if not present', () => {
        expect(ensureKeyPrefix('file.pdf', 'staging/')).toBe('staging/file.pdf')
        expect(ensureKeyPrefix('path/to/file.pdf', 'staging/')).toBe('staging/path/to/file.pdf')
      })
      
      it('should not duplicate prefix if already present', () => {
        expect(ensureKeyPrefix('staging/file.pdf', 'staging/')).toBe('staging/file.pdf')
        expect(ensureKeyPrefix('staging/path/to/file.pdf', 'staging/')).toBe('staging/path/to/file.pdf')
      })
      
      it('should remove leading slash before adding prefix', () => {
        expect(ensureKeyPrefix('/file.pdf', 'staging/')).toBe('staging/file.pdf')
        expect(ensureKeyPrefix('/path/to/file.pdf', 'staging/')).toBe('staging/path/to/file.pdf')
      })
    })
    
    describe('removeKeyPrefix', () => {
      it('should remove prefix if present', () => {
        expect(removeKeyPrefix('staging/file.pdf', 'staging/')).toBe('file.pdf')
        expect(removeKeyPrefix('staging/path/to/file.pdf', 'staging/')).toBe('path/to/file.pdf')
      })
      
      it('should return key unchanged if prefix not present', () => {
        expect(removeKeyPrefix('file.pdf', 'staging/')).toBe('file.pdf')
        expect(removeKeyPrefix('prod/file.pdf', 'staging/')).toBe('prod/file.pdf')
      })
    })
  })
  
  describe('Storage Configuration', () => {
    describe('getStorageConfig', () => {
      it('should default to S3 for staging environment', () => {
        process.env.NEXT_PUBLIC_ENV = 'staging'
        delete process.env.STORAGE_PROVIDER
        
        const config = getStorageConfig()
        expect(config.provider).toBe('s3')
        expect(config.prefix).toBe('staging/')
      })
      
      it('should default to Supabase for development environment', () => {
        process.env.NEXT_PUBLIC_ENV = 'development'
        delete process.env.STORAGE_PROVIDER
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
        
        const config = getStorageConfig()
        expect(config.provider).toBe('supabase')
        expect(config.prefix).toBe('dev/')
      })
      
      it('should use prod prefix for production environment', () => {
        process.env.NEXT_PUBLIC_ENV = 'production'
        process.env.STORAGE_PROVIDER = 's3'
        process.env.S3_BUCKET = 'prod-bucket'
        process.env.S3_REGION = 'us-east-1'
        
        const config = getStorageConfig()
        expect(config.prefix).toBe('prod/')
      })
      
      it('should respect STORAGE_PROVIDER override', () => {
        process.env.NEXT_PUBLIC_ENV = 'staging'
        process.env.STORAGE_PROVIDER = 'supabase'
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
        
        const config = getStorageConfig()
        expect(config.provider).toBe('supabase')
      })
      
      it('should respect STORAGE_PREFIX override', () => {
        process.env.NEXT_PUBLIC_ENV = 'staging'
        process.env.STORAGE_PREFIX = 'custom-prefix/'
        
        const config = getStorageConfig()
        expect(config.prefix).toBe('custom-prefix/')
      })
      
      it('should add trailing slash to custom prefix if missing', () => {
        process.env.NEXT_PUBLIC_ENV = 'staging'
        process.env.STORAGE_PREFIX = 'custom-prefix'
        
        const config = getStorageConfig()
        expect(config.prefix).toBe('custom-prefix/')
      })
      
      it('should throw error if non-production uses prod prefix', () => {
        process.env.NEXT_PUBLIC_ENV = 'staging'
        process.env.STORAGE_PREFIX = 'prod/'
        
        expect(() => getStorageConfig()).toThrow('Non-production environment cannot use "prod/" prefix')
      })
      
      it('should validate S3 configuration', () => {
        process.env.NEXT_PUBLIC_ENV = 'staging'
        process.env.STORAGE_PROVIDER = 's3'
        delete process.env.S3_BUCKET
        delete process.env.AWS_S3_BUCKET
        
        expect(() => getStorageConfig()).toThrow('Storage bucket not configured')
      })
      
      it('should validate Supabase configuration', () => {
        process.env.NEXT_PUBLIC_ENV = 'staging'
        process.env.STORAGE_PROVIDER = 'supabase'
        delete process.env.NEXT_PUBLIC_SUPABASE_URL
        
        expect(() => getStorageConfig()).toThrow('Supabase URL and anon key required')
      })
    })
    
    describe('getStoragePath', () => {
      it('should add environment prefix to key', () => {
        process.env.NEXT_PUBLIC_ENV = 'staging'
        expect(getStoragePath('file.pdf')).toBe('staging/file.pdf')
        expect(getStoragePath('path/to/file.pdf')).toBe('staging/path/to/file.pdf')
      })
      
      it('should not duplicate prefix', () => {
        process.env.NEXT_PUBLIC_ENV = 'staging'
        expect(getStoragePath('staging/file.pdf')).toBe('staging/file.pdf')
      })
      
      it('should remove leading slash', () => {
        process.env.NEXT_PUBLIC_ENV = 'staging'
        expect(getStoragePath('/file.pdf')).toBe('staging/file.pdf')
      })
    })
    
    describe('parseStoragePath', () => {
      it('should extract environment from known prefixes', () => {
        expect(parseStoragePath('prod/file.pdf')).toEqual({
          env: 'prod',
          key: 'file.pdf',
        })
        
        expect(parseStoragePath('staging/path/to/file.pdf')).toEqual({
          env: 'staging',
          key: 'path/to/file.pdf',
        })
        
        expect(parseStoragePath('dev/file.pdf')).toEqual({
          env: 'dev',
          key: 'file.pdf',
        })
      })
      
      it('should return unknown for unrecognized prefixes', () => {
        expect(parseStoragePath('custom/file.pdf')).toEqual({
          env: 'unknown',
          key: 'custom/file.pdf',
        })
        
        expect(parseStoragePath('file.pdf')).toEqual({
          env: 'unknown',
          key: 'file.pdf',
        })
      })
    })
  })
  
  describe('Environment-based Prefixing', () => {
    it('should use correct prefix for each environment', () => {
      const environments = [
        { env: 'production', expectedPrefix: 'prod/' },
        { env: 'staging', expectedPrefix: 'staging/' },
        { env: 'development', expectedPrefix: 'dev/' },
        { env: 'test', expectedPrefix: 'test/' },
      ]
      
      environments.forEach(({ env, expectedPrefix }) => {
        process.env.NEXT_PUBLIC_ENV = env
        process.env.STORAGE_PROVIDER = 's3'
        process.env.S3_BUCKET = 'test-bucket'
        process.env.S3_REGION = 'us-east-1'
        
        if (env !== 'production') {
          const config = getStorageConfig()
          expect(config.prefix).toBe(expectedPrefix)
        }
      })
    })
  })
  
  describe('S3 Configuration', () => {
    it('should build correct S3 config', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      process.env.STORAGE_PROVIDER = 's3'
      process.env.S3_BUCKET = 'my-bucket'
      process.env.S3_REGION = 'us-west-2'
      
      const config = getStorageConfig()
      
      expect(config.provider).toBe('s3')
      expect(config.bucket).toBe('my-bucket')
      expect(config.region).toBe('us-west-2')
      expect(config.publicUrl).toBe('https://my-bucket.s3.us-west-2.amazonaws.com')
    })
    
    it('should use AWS_ prefixed env vars as fallback', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      process.env.STORAGE_PROVIDER = 's3'
      process.env.AWS_S3_BUCKET = 'aws-bucket'
      process.env.AWS_REGION = 'eu-west-1'
      
      const config = getStorageConfig()
      
      expect(config.bucket).toBe('aws-bucket')
      expect(config.region).toBe('eu-west-1')
    })
    
    it('should include credentials if provided', () => {
      process.env.NEXT_PUBLIC_ENV = 'staging'
      process.env.STORAGE_PROVIDER = 's3'
      process.env.S3_BUCKET = 'my-bucket'
      process.env.S3_REGION = 'us-east-1'
      process.env.AWS_ACCESS_KEY_ID = 'test-key'
      process.env.AWS_SECRET_ACCESS_KEY = 'test-secret'
      
      const config = getStorageConfig()
      
      expect(config.credentials).toEqual({
        accessKeyId: 'test-key',
        secretAccessKey: 'test-secret',
      })
    })
  })
  
  describe('Supabase Configuration', () => {
    it('should build correct Supabase config', () => {
      process.env.NEXT_PUBLIC_ENV = 'development'
      process.env.STORAGE_PROVIDER = 'supabase'
      process.env.STORAGE_BUCKET = 'uploads'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key'
      
      const config = getStorageConfig()
      
      expect(config.provider).toBe('supabase')
      expect(config.bucket).toBe('uploads')
      expect(config.supabase).toEqual({
        url: 'https://test.supabase.co',
        anonKey: 'anon-key',
        serviceRoleKey: 'service-key',
      })
      expect(config.publicUrl).toBe('https://test.supabase.co/storage/v1/object/public/uploads')
    })
  })
})