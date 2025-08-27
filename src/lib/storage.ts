/**
 * Pluggable Storage Driver System
 * Supports both Supabase and AWS S3 backends
 */

import { S3Storage } from "./storage-s3";
import { SupabaseStorage } from "./storage-supabase";

/**
 * Storage Driver Interface
 * All storage implementations must satisfy this interface
 */
export interface StorageDriver {
  /**
   * Upload a file to storage
   */
  upload(args: {
    bucket: string;
    key: string;
    contentType: string;
    body: Buffer | Uint8Array | Blob | string;
  }): Promise<{ bucket: string; key: string }>;

  /**
   * Get a signed URL for secure file access
   */
  getSignedUrl(args: {
    bucket: string;
    key: string;
    expiresInSeconds?: number;
    operation?: 'get' | 'put';
  }): Promise<string>;

  /**
   * Delete a file from storage
   */
  delete(args: {
    bucket: string;
    key: string;
  }): Promise<void>;
}

/**
 * Factory function to get the appropriate storage driver
 * Based on STORAGE_DRIVER environment variable
 */
export function getStorage(): StorageDriver {
  const driver = (process.env.STORAGE_DRIVER || "SUPABASE").toUpperCase();
  
  if (driver === "S3") {
    return S3Storage;
  }
  
  // Default to Supabase for backward compatibility
  return SupabaseStorage;
}