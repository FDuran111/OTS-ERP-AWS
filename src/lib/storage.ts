/**
 * Pluggable Storage Driver System
 * Uses AWS S3 for storage
 */

import { S3Storage } from "./storage-s3";

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
 * Uses AWS S3 storage
 */
export function getStorage(): StorageDriver {
  return S3Storage;
}