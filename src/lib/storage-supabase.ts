/**
 * Supabase Storage Adapter
 * Implements StorageDriver interface using existing Supabase storage
 */

import { StorageDriver } from './storage';
import { supabaseStorage } from './supabase-storage';

class SupabaseStorageAdapter implements StorageDriver {
  /**
   * Upload file to Supabase Storage
   */
  async upload(args: {
    bucket: string;
    key: string;
    contentType: string;
    body: Buffer | Uint8Array | Blob | string;
  }): Promise<{ bucket: string; key: string }> {
    const { bucket, key, contentType, body } = args;

    // Convert body to File-like object for Supabase
    let file: File;
    if (body instanceof Blob) {
      file = new File([body], key.split('/').pop() || 'file', { type: contentType });
    } else if (typeof body === 'string') {
      const blob = new Blob([body], { type: contentType });
      file = new File([blob], key.split('/').pop() || 'file', { type: contentType });
    } else {
      // Buffer or Uint8Array
      const blob = new Blob([body], { type: contentType });
      file = new File([blob], key.split('/').pop() || 'file', { type: contentType });
    }

    // Extract category from key (e.g., "jobs/123/file.pdf" -> "jobs")
    const category = key.split('/')[0] as 'jobs' | 'customers' | 'materials' | 'documents';
    
    // Upload using existing Supabase storage
    const result = await supabaseStorage.uploadFile(file, category);

    return {
      bucket,
      key: result.filePath
    };
  }

  /**
   * Get signed URL from Supabase Storage
   */
  async getSignedUrl(args: {
    bucket: string;
    key: string;
    expiresInSeconds?: number;
    operation?: 'get' | 'put';
  }): Promise<string> {
    const { bucket, key, expiresInSeconds = 3600, operation = 'get' } = args;

    if (operation === 'put') {
      // Supabase doesn't support PUT presigned URLs in the same way
      // Return a placeholder or throw an error
      throw new Error('PUT presigned URLs not supported in Supabase adapter');
    }

    // Get signed URL for GET operation
    const signedUrl = await supabaseStorage.getSignedUrl(key, expiresInSeconds);
    
    if (!signedUrl) {
      throw new Error(`Failed to generate signed URL for ${key}`);
    }

    return signedUrl;
  }

  /**
   * Delete file from Supabase Storage
   */
  async delete(args: {
    bucket: string;
    key: string;
  }): Promise<void> {
    const { key } = args;
    
    await supabaseStorage.deleteFile(key);
    
    // Also try to delete thumbnail if it's an image
    const thumbnailKey = key.replace(/^(.+)\/(.+)$/, '$1/thumb_$2');
    try {
      await supabaseStorage.deleteThumbnail(thumbnailKey);
    } catch {
      // Ignore thumbnail deletion errors
    }
  }
}

// Export singleton instance
export const SupabaseStorage: StorageDriver = new SupabaseStorageAdapter();