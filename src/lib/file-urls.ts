/**
 * File URL generation with CloudFront CDN support
 */

import { getStorage } from '@/lib/storage';
import { bucketFor } from './file-keys';

const CF = process.env.S3_CLOUDFRONT_URL?.replace(/\/+$/, ''); // optional CDN

/**
 * Returns a URL for reading a file:
 * - If S3_CLOUDFRONT_URL is set and no auth required -> build a public CDN URL
 * - Else -> return a presigned GET URL via storage adapter
 */
export async function urlFor(
  category: Parameters<typeof bucketFor>[0], 
  key: string, 
  opts?: { 
    expiresInSeconds?: number, 
    forceSigned?: boolean 
  }
) {
  const bucket = bucketFor(category);
  const driver = (process.env.STORAGE_DRIVER || 'SUPABASE').toUpperCase();

  // Use CloudFront public URL if available and not forced to sign
  if (!opts?.forceSigned && CF && driver === 'S3') {
    return `${CF}/${bucket}/${key}`.replace(/\/+/g, '/');
  }

  // Otherwise use presigned URL from storage adapter
  const storage = getStorage();
  return storage.getSignedUrl({ 
    bucket, 
    key, 
    expiresInSeconds: opts?.expiresInSeconds ?? 3600, 
    operation: 'get' 
  });
}