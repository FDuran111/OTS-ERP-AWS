/**
 * Supabase Storage Provider
 * Implements StorageProvider interface for Supabase Storage
 */

import { createClient } from '@supabase/supabase-js'
import type { StorageProvider, StorageFile, StorageUploadOptions, StorageListOptions } from './index'
import type { StorageConfig } from './config'
import { ensureKeyPrefix, removeKeyPrefix } from './index'

export class SupabaseStorageProvider implements StorageProvider {
  private client: any
  private bucket: string
  private prefix: string
  private publicUrl: string
  
  constructor(config: StorageConfig) {
    if (!config.supabase?.url || !config.supabase?.anonKey) {
      throw new Error('Supabase URL and anon key required for Supabase storage')
    }
    
    this.bucket = config.bucket
    this.prefix = config.prefix
    this.publicUrl = config.publicUrl || `${config.supabase.url}/storage/v1/object/public/${config.bucket}`
    
    // Initialize Supabase client
    // Use service role key if available for server-side operations
    const supabaseKey = config.supabase.serviceRoleKey || config.supabase.anonKey
    
    this.client = createClient(config.supabase.url, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  
  async upload(
    key: string,
    file: Buffer | Blob | File,
    options?: StorageUploadOptions
  ): Promise<{ key: string; url?: string }> {
    // Ensure key has environment prefix
    const fullKey = ensureKeyPrefix(key, this.prefix)
    
    // Convert Buffer to Blob if needed (Supabase prefers Blob/File)
    let uploadFile: Blob | File
    if (file instanceof Buffer) {
      uploadFile = new Blob([file], { type: options?.contentType || 'application/octet-stream' })
    } else if (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File)) {
      uploadFile = file
    } else {
      // If it's not a Buffer, Blob, or File, convert it to a Blob
      uploadFile = new Blob([file as any], { type: options?.contentType || 'application/octet-stream' })
    }
    
    try {
      const { data, error } = await this.client.storage
        .from(this.bucket)
        .upload(fullKey, uploadFile, {
          contentType: options?.contentType,
          upsert: true, // Allow overwriting
          metadata: options?.metadata,
        })
      
      if (error) {
        throw error
      }
      
      const result: { key: string; url?: string } = { key: fullKey }
      
      // Add public URL if file is public
      if (options?.public) {
        result.url = this.getPublicUrl(key)
      }
      
      return result
    } catch (error) {
      console.error('Supabase upload error:', error)
      throw new Error(`Failed to upload file to Supabase: ${error}`)
    }
  }
  
  async get(key: string): Promise<{ data: Buffer; contentType?: string }> {
    const fullKey = ensureKeyPrefix(key, this.prefix)
    
    try {
      const { data, error } = await this.client.storage
        .from(this.bucket)
        .download(fullKey)
      
      if (error) {
        throw error
      }
      
      if (!data) {
        throw new Error('No data received from Supabase')
      }
      
      // Convert Blob to Buffer
      const arrayBuffer = await data.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      return {
        data: buffer,
        contentType: data.type,
      }
    } catch (error: any) {
      if (error.message?.includes('not found')) {
        throw new Error(`File not found: ${key}`)
      }
      console.error('Supabase get error:', error)
      throw new Error(`Failed to get file from Supabase: ${error.message}`)
    }
  }
  
  async remove(key: string): Promise<void> {
    const fullKey = ensureKeyPrefix(key, this.prefix)
    
    try {
      const { error } = await this.client.storage
        .from(this.bucket)
        .remove([fullKey])
      
      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Supabase delete error:', error)
      throw new Error(`Failed to delete file from Supabase: ${error}`)
    }
  }
  
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const fullKey = ensureKeyPrefix(key, this.prefix)
    
    try {
      const { data, error } = await this.client.storage
        .from(this.bucket)
        .createSignedUrl(fullKey, expiresIn)
      
      if (error) {
        throw error
      }
      
      if (!data?.signedUrl) {
        throw new Error('No signed URL returned')
      }
      
      return data.signedUrl
    } catch (error) {
      console.error('Supabase signed URL error:', error)
      throw new Error(`Failed to generate signed URL: ${error}`)
    }
  }
  
  async list(options?: StorageListOptions): Promise<StorageFile[]> {
    const prefix = options?.prefix 
      ? ensureKeyPrefix(options.prefix, this.prefix)
      : this.prefix
    
    try {
      const { data, error } = await this.client.storage
        .from(this.bucket)
        .list(prefix, {
          limit: options?.maxKeys || 1000,
        })
      
      if (error) {
        throw error
      }
      
      if (!data) {
        return []
      }
      
      const files: StorageFile[] = data.map((file: any) => ({
        name: removeKeyPrefix(file.name, this.prefix),
        size: file.metadata?.size || 0,
        lastModified: file.updated_at ? new Date(file.updated_at) : undefined,
        contentType: file.metadata?.mimetype,
      }))
      
      return files
    } catch (error) {
      console.error('Supabase list error:', error)
      throw new Error(`Failed to list files from Supabase: ${error}`)
    }
  }
  
  getPublicUrl(key: string): string {
    const fullKey = ensureKeyPrefix(key, this.prefix)
    
    // Supabase public URL format
    return `${this.publicUrl}/${fullKey}`
  }
  
  async exists(key: string): Promise<boolean> {
    const fullKey = ensureKeyPrefix(key, this.prefix)
    
    try {
      // Try to get file metadata
      const { data, error } = await this.client.storage
        .from(this.bucket)
        .list(this.prefix, {
          limit: 1,
          search: fullKey,
        })
      
      if (error) {
        console.error('Supabase exists check error:', error)
        return false
      }
      
      // Check if the exact file exists in the results
      return data?.some((file: any) => `${this.prefix}${file.name}` === fullKey) || false
    } catch (error) {
      console.error('Supabase exists check error:', error)
      return false
    }
  }
}