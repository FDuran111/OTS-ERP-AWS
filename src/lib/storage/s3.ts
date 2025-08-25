/**
 * S3 Storage Provider
 * Implements StorageProvider interface for AWS S3
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { StorageProvider, StorageFile, StorageUploadOptions, StorageListOptions } from './index'
import type { StorageConfig } from './config'
import { ensureKeyPrefix, removeKeyPrefix } from './index'

export class S3StorageProvider implements StorageProvider {
  private client: S3Client
  private bucket: string
  private prefix: string
  private publicUrl?: string
  
  constructor(config: StorageConfig) {
    this.bucket = config.bucket
    this.prefix = config.prefix
    this.publicUrl = config.publicUrl
    
    // Initialize S3 client
    const clientConfig: any = {
      region: config.region,
    }
    
    // Add credentials if provided (for local development)
    if (config.credentials?.accessKeyId && config.credentials?.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.credentials.accessKeyId,
        secretAccessKey: config.credentials.secretAccessKey,
      }
    }
    
    this.client = new S3Client(clientConfig)
  }
  
  async upload(
    key: string,
    file: Buffer | Blob | File,
    options?: StorageUploadOptions
  ): Promise<{ key: string; url?: string }> {
    // Ensure key has environment prefix
    const fullKey = ensureKeyPrefix(key, this.prefix)
    
    // Convert Blob/File to Buffer if needed
    let body: Buffer | Uint8Array
    if (file instanceof Buffer) {
      body = file
    } else if (file instanceof Blob || file instanceof File) {
      const arrayBuffer = await file.arrayBuffer()
      body = new Uint8Array(arrayBuffer)
    } else {
      throw new Error('Invalid file type')
    }
    
    // Prepare S3 upload command
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
      Body: body,
      ContentType: options?.contentType || 'application/octet-stream',
      Metadata: options?.metadata,
      ACL: options?.public ? 'public-read' : 'private',
    })
    
    try {
      await this.client.send(command)
      
      const result: { key: string; url?: string } = { key: fullKey }
      
      // Add public URL if file is public
      if (options?.public && this.publicUrl) {
        result.url = `${this.publicUrl}/${fullKey}`
      }
      
      return result
    } catch (error) {
      console.error('S3 upload error:', error)
      throw new Error(`Failed to upload file to S3: ${error}`)
    }
  }
  
  async get(key: string): Promise<{ data: Buffer; contentType?: string }> {
    const fullKey = ensureKeyPrefix(key, this.prefix)
    
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
    })
    
    try {
      const response = await this.client.send(command)
      
      if (!response.Body) {
        throw new Error('No data received from S3')
      }
      
      // Convert stream to buffer
      const chunks: Uint8Array[] = []
      const stream = response.Body as any
      
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      
      const buffer = Buffer.concat(chunks)
      
      return {
        data: buffer,
        contentType: response.ContentType,
      }
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        throw new Error(`File not found: ${key}`)
      }
      console.error('S3 get error:', error)
      throw new Error(`Failed to get file from S3: ${error.message}`)
    }
  }
  
  async remove(key: string): Promise<void> {
    const fullKey = ensureKeyPrefix(key, this.prefix)
    
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
    })
    
    try {
      await this.client.send(command)
    } catch (error) {
      console.error('S3 delete error:', error)
      throw new Error(`Failed to delete file from S3: ${error}`)
    }
  }
  
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const fullKey = ensureKeyPrefix(key, this.prefix)
    
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
    })
    
    try {
      const url = await getSignedUrl(this.client, command, { expiresIn })
      return url
    } catch (error) {
      console.error('S3 signed URL error:', error)
      throw new Error(`Failed to generate signed URL: ${error}`)
    }
  }
  
  async list(options?: StorageListOptions): Promise<StorageFile[]> {
    const prefix = options?.prefix 
      ? ensureKeyPrefix(options.prefix, this.prefix)
      : this.prefix
    
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
      MaxKeys: options?.maxKeys || 1000,
      Delimiter: options?.delimiter,
    })
    
    try {
      const response = await this.client.send(command)
      
      const files: StorageFile[] = []
      
      if (response.Contents) {
        for (const object of response.Contents) {
          if (object.Key) {
            files.push({
              name: removeKeyPrefix(object.Key, this.prefix),
              size: object.Size || 0,
              lastModified: object.LastModified,
            })
          }
        }
      }
      
      return files
    } catch (error) {
      console.error('S3 list error:', error)
      throw new Error(`Failed to list files from S3: ${error}`)
    }
  }
  
  getPublicUrl(key: string): string {
    const fullKey = ensureKeyPrefix(key, this.prefix)
    
    if (!this.publicUrl) {
      throw new Error('Public URL not configured for S3 storage')
    }
    
    return `${this.publicUrl}/${fullKey}`
  }
  
  async exists(key: string): Promise<boolean> {
    const fullKey = ensureKeyPrefix(key, this.prefix)
    
    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: fullKey,
    })
    
    try {
      await this.client.send(command)
      return true
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false
      }
      console.error('S3 exists check error:', error)
      throw new Error(`Failed to check file existence: ${error.message}`)
    }
  }
}