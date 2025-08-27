/**
 * AWS S3 Storage Adapter
 * Implements StorageDriver interface using AWS S3
 */

import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand, 
  GetObjectCommand 
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";
import { StorageDriver } from './storage';

// Initialize S3 client
const s3 = new S3Client({ 
  region: process.env.S3_REGION || 'us-east-2' 
});

class S3StorageAdapter implements StorageDriver {
  /**
   * Upload file to S3
   */
  async upload(args: {
    bucket: string;
    key: string;
    contentType: string;
    body: Buffer | Uint8Array | Blob | string;
  }): Promise<{ bucket: string; key: string }> {
    const { bucket, key, contentType, body } = args;

    // Convert Blob to Buffer if needed
    let uploadBody: Buffer | Uint8Array | string;
    if (body instanceof Blob) {
      const arrayBuffer = await body.arrayBuffer();
      uploadBody = Buffer.from(arrayBuffer);
    } else {
      uploadBody = body;
    }

    // Use configured bucket or fallback to provided bucket
    const targetBucket = process.env.S3_BUCKET || bucket;

    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: key,
      Body: uploadBody,
      ContentType: contentType,
    });

    await s3.send(command);

    return {
      bucket: targetBucket,
      key
    };
  }

  /**
   * Get signed URL for S3 object
   */
  async getSignedUrl(args: {
    bucket: string;
    key: string;
    expiresInSeconds?: number;
    operation?: 'get' | 'put';
  }): Promise<string> {
    const { bucket, key, expiresInSeconds = 3600, operation = 'get' } = args;

    // Use configured bucket or fallback to provided bucket
    const targetBucket = process.env.S3_BUCKET || bucket;

    // Check if CloudFront URL is configured and operation is 'get'
    if (operation === 'get' && process.env.S3_CLOUDFRONT_URL) {
      // Return CloudFront URL for public access (no signing)
      return `${process.env.S3_CLOUDFRONT_URL}/${key}`;
    }

    // Create appropriate command based on operation
    let command;
    if (operation === 'put') {
      command = new PutObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });
    } else {
      command = new GetObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });
    }

    // Generate presigned URL
    const signedUrl = await awsGetSignedUrl(s3, command, {
      expiresIn: expiresInSeconds,
    });

    return signedUrl;
  }

  /**
   * Delete file from S3
   */
  async delete(args: {
    bucket: string;
    key: string;
  }): Promise<void> {
    const { bucket, key } = args;

    // Use configured bucket or fallback to provided bucket
    const targetBucket = process.env.S3_BUCKET || bucket;

    const command = new DeleteObjectCommand({
      Bucket: targetBucket,
      Key: key,
    });

    await s3.send(command);

    // Also delete thumbnail if it exists (for images)
    if (key.includes('/') && !key.includes('thumb_')) {
      const parts = key.split('/');
      const filename = parts.pop();
      const thumbnailKey = [...parts, `thumb_${filename}`].join('/');
      
      try {
        const thumbCommand = new DeleteObjectCommand({
          Bucket: targetBucket,
          Key: thumbnailKey,
        });
        await s3.send(thumbCommand);
      } catch {
        // Ignore thumbnail deletion errors
      }
    }
  }
}

// Export singleton instance
export const S3Storage: StorageDriver = new S3StorageAdapter();