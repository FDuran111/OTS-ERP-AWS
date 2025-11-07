import { uploadToS3, deleteFromS3, getPresignedUrl } from './aws-s3'
import { uploadToSupabase, deleteFromSupabase, getPublicUrl } from './supabase-storage'
import fs from 'fs/promises'
import path from 'path'

export interface StorageAdapter {
  upload: (params: UploadParams) => Promise<UploadResult>
  delete: (key: string) => Promise<void>
  getUrl: (key: string) => Promise<string>
}

interface UploadParams {
  key: string
  body: Buffer | Uint8Array | string
  contentType: string
  metadata?: Record<string, string>
}

interface UploadResult {
  key: string
  url: string
  size: number
}

class LocalStorageAdapter implements StorageAdapter {
  private baseDir = path.join(process.cwd(), 'public', 'uploads')

  async upload(params: UploadParams): Promise<UploadResult> {
    const { key, body } = params

    // Create directory structure
    const filePath = path.join(this.baseDir, key)
    const dir = path.dirname(filePath)
    await fs.mkdir(dir, { recursive: true })

    // Write file
    await fs.writeFile(filePath, body)

    // Return local URL
    return {
      key,
      url: `/uploads/${key}`,
      size: body instanceof Buffer ? body.length : new Blob([body]).size
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key)
    try {
      await fs.unlink(filePath)
    } catch (error) {
      console.warn('File not found for deletion:', key)
    }
  }

  async getUrl(key: string): Promise<string> {
    // For local storage, just return the public URL
    return `/uploads/${key}`
  }
}

class S3StorageAdapter implements StorageAdapter {
  async upload(params: UploadParams): Promise<UploadResult> {
    const result = await uploadToS3(params)
    return {
      key: result.key,
      url: result.url,
      size: result.size
    }
  }

  async delete(key: string): Promise<void> {
    await deleteFromS3(key)
  }

  async getUrl(key: string): Promise<string> {
    return await getPresignedUrl(key)
  }
}

class SupabaseStorageAdapter implements StorageAdapter {
  async upload(params: UploadParams): Promise<UploadResult> {
    const result = await uploadToSupabase(params)
    return {
      key: result.key,
      url: result.url,
      size: result.size
    }
  }

  async delete(key: string): Promise<void> {
    await deleteFromSupabase(key)
  }

  async getUrl(key: string): Promise<string> {
    return await getPublicUrl(key)
  }
}

// Export singleton based on STORAGE_PROVIDER environment variable
// Default to local storage for safety
function getStorageAdapter(): StorageAdapter {
  const provider = process.env.STORAGE_PROVIDER?.toLowerCase()

  switch (provider) {
    case 's3':
      return new S3StorageAdapter()
    case 'supabase':
      return new SupabaseStorageAdapter()
    default:
      console.warn(`Unknown STORAGE_PROVIDER: ${provider}. Falling back to local storage.`)
      return new LocalStorageAdapter()
  }
}

export const storage: StorageAdapter = getStorageAdapter()

export default storage