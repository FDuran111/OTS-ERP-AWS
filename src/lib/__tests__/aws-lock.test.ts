/**
 * Tests for AWS Services Lock
 * Ensures staging/production environments are locked to AWS services only
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock environment variables
const mockEnv = (vars: Record<string, string | undefined>) => {
  Object.keys(process.env).forEach(key => {
    if (key.startsWith('NEXT_PUBLIC_') || key.startsWith('SUPABASE') || key === 'DATABASE_URL' || key === 'STORAGE_PROVIDER') {
      delete process.env[key];
    }
  });
  Object.assign(process.env, vars);
};

describe('AWS Services Lock', () => {
  beforeEach(() => {
    // Reset modules to ensure fresh imports
    vi.resetModules();
  });

  describe('Storage Configuration', () => {
    it('should force S3 storage for staging environment', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'staging',
        STORAGE_PROVIDER: 'supabase', // Try to use Supabase
        AWS_S3_BUCKET: 'test-bucket',
        AWS_REGION: 'us-east-2'
      });

      const { getStorageConfig } = await import('../storage/config');
      
      // Should throw error when trying to use non-S3 in staging
      expect(() => getStorageConfig()).toThrow('staging environment MUST use S3 storage');
    });

    it('should force S3 storage for production environment', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'production',
        STORAGE_PROVIDER: 'supabase', // Try to use Supabase
        AWS_S3_BUCKET: 'prod-bucket',
        AWS_REGION: 'us-east-2'
      });

      const { getStorageConfig } = await import('../storage/config');
      
      // Should throw error when trying to use non-S3 in production
      expect(() => getStorageConfig()).toThrow('production environment MUST use S3 storage');
    });

    it('should allow S3 storage in staging', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'staging',
        STORAGE_PROVIDER: 's3',
        AWS_S3_BUCKET: 'staging-bucket',
        AWS_REGION: 'us-east-2'
      });

      const { getStorageConfig } = await import('../storage/config');
      const config = getStorageConfig();
      
      expect(config.provider).toBe('s3');
      expect(config.bucket).toBe('staging-bucket');
      expect(config.prefix).toBe('staging/');
    });

    it('should allow Supabase storage in development', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'development',
        STORAGE_PROVIDER: 'supabase',
        STORAGE_BUCKET: 'dev-uploads',
        NEXT_PUBLIC_SUPABASE_URL: 'https://dev.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key'
      });

      const { getStorageConfig } = await import('../storage/config');
      const config = getStorageConfig();
      
      expect(config.provider).toBe('supabase');
      expect(config.bucket).toBe('dev-uploads');
      expect(config.prefix).toBe('dev/');
    });
  });

  describe('Storage Provider Dynamic Import', () => {
    it('should reject Supabase provider in staging', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'staging',
        STORAGE_PROVIDER: 's3',
        AWS_S3_BUCKET: 'staging-bucket',
        AWS_REGION: 'us-east-2'
      });

      // Mock the storage config to return supabase (simulating misconfiguration)
      vi.doMock('../storage/config', () => ({
        getStorageConfig: () => ({
          provider: 'supabase',
          bucket: 'test',
          prefix: 'staging/'
        }),
        isAwsEnv: true
      }));

      const { getStorageProvider } = await import('../storage');
      
      // Should throw when trying to use Supabase in AWS environment
      await expect(getStorageProvider()).rejects.toThrow('Supabase storage cannot be used in staging/production');
    });
  });

  describe('Environment Isolation', () => {
    it('should detect Supabase variables in staging', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'staging',
        NEXT_PUBLIC_SUPABASE_URL: 'https://staging.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'secret-key',
        DATABASE_URL: 'postgresql://user:pass@staging.us-east-2.rds.amazonaws.com:5432/db'
      });

      const { assertEnvIsolation } = await import('../assertEnvIsolation');
      
      // Should throw due to Supabase variables in staging
      expect(() => assertEnvIsolation()).toThrow('Supabase variables detected');
    });

    it('should detect Supabase in DATABASE_URL for staging', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'staging',
        DATABASE_URL: 'postgresql://user:pass@staging.supabase.co:5432/db'
      });

      const { assertEnvIsolation } = await import('../assertEnvIsolation');
      
      // Should throw due to Supabase in DATABASE_URL
      expect(() => assertEnvIsolation()).toThrow('DATABASE_URL points to Supabase');
    });

    it('should pass with proper AWS configuration in staging', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'staging',
        DATABASE_URL: 'postgresql://user:pass@staging.abcdef.us-east-2.rds.amazonaws.com:5432/db',
        STORAGE_PROVIDER: 's3',
        AWS_S3_BUCKET: 'staging-bucket',
        AWS_REGION: 'us-east-2'
      });

      const { assertEnvIsolation } = await import('../assertEnvIsolation');
      
      // Should not throw with proper AWS configuration
      expect(() => assertEnvIsolation()).not.toThrow();
    });

    it('should detect production indicators in staging URLs', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'staging',
        DATABASE_URL: 'postgresql://user:pass@prod-db.rds.amazonaws.com:5432/db',
        AWS_S3_BUCKET: 'production-bucket'
      });

      const { assertEnvIsolation } = await import('../assertEnvIsolation');
      
      // Should throw due to production indicators
      expect(() => assertEnvIsolation()).toThrow('production indicators');
    });
  });

  describe('Database Verification', () => {
    it('should require RDS for staging', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'staging',
        DATABASE_URL: 'postgresql://user:pass@some-host.com:5432/db'
      });

      // Should throw when database is not RDS
      await expect(import('../db')).rejects.toThrow('staging environment MUST use AWS RDS');
    });

    it('should require RDS for production', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'production',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db'
      });

      // Should throw when database is not RDS
      await expect(import('../db')).rejects.toThrow('production environment MUST use AWS RDS');
    });

    it('should accept RDS database in staging', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'staging',
        DATABASE_URL: 'postgresql://user:pass@staging.abcdef.us-east-2.rds.amazonaws.com:5432/db'
      });

      // Mock console.log to verify success message
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await import('../db');
      
      // Should log success message
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Database verified: AWS RDS'));
      
      consoleSpy.mockRestore();
    });

    it('should allow any database in development', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'development',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db'
      });

      // Should not throw in development
      await expect(import('../db')).resolves.toBeDefined();
    });
  });

  describe('Environment Status Reporting', () => {
    it('should report correct status for compliant staging environment', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'staging',
        DATABASE_URL: 'postgresql://user:pass@staging.abcdef.us-east-2.rds.amazonaws.com:5432/db',
        STORAGE_PROVIDER: 's3',
        AWS_S3_BUCKET: 'staging-bucket',
        AWS_REGION: 'us-east-2'
      });

      const { getEnvIsolationStatus } = await import('../assertEnvIsolation');
      const status = getEnvIsolationStatus();
      
      expect(status.isValid).toBe(true);
      expect(status.violations).toHaveLength(0);
    });

    it('should report violations for non-compliant staging environment', async () => {
      mockEnv({
        NEXT_PUBLIC_ENV: 'staging',
        DATABASE_URL: 'postgresql://user:pass@prod.rds.amazonaws.com:5432/db',
        AWS_S3_BUCKET: 'production-bucket',
        NEXT_PUBLIC_SUPABASE_URL: 'https://prod.supabase.co'
      });

      const { getEnvIsolationStatus } = await import('../assertEnvIsolation');
      const status = getEnvIsolationStatus();
      
      expect(status.isValid).toBe(false);
      expect(status.violations.length).toBeGreaterThan(0);
      expect(status.violations.some(v => v.includes('production indicators'))).toBe(true);
    });
  });
});