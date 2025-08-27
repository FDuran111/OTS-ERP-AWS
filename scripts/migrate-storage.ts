#!/usr/bin/env node
/**
 * Supabase to S3 Storage Migration Script
 * Supports dry-run, resume, and logging
 */

import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { createReadStream, createWriteStream, existsSync, readFileSync } from 'fs'
import { parse } from 'csv-parse/sync'
import { stringify } from 'csv-stringify/sync'
import { appendFileSync } from 'fs'

// Parse CLI arguments
const args = process.argv.slice(2)
const argMap = new Map<string, string>()
let currentKey: string | null = null

for (const arg of args) {
  if (arg.startsWith('--')) {
    currentKey = arg
    argMap.set(currentKey, 'true')
  } else if (currentKey) {
    argMap.set(currentKey, arg)
    currentKey = null
  }
}

const isDryRun = argMap.has('--dry-run')
const prefix = argMap.get('--prefix')
const resumeLog = argMap.get('--resume')

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xudcmdliqyarbfdqufbq.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const S3_BUCKET = process.env.S3_BUCKET || ''
const S3_REGION = process.env.S3_REGION || 'us-east-2'
const LOG_FILE = 'migration-log.csv'

// Validate configuration
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

if (!S3_BUCKET && !isDryRun) {
  console.error('❌ S3_BUCKET is required for non-dry-run mode')
  process.exit(1)
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const s3 = new S3Client({ region: S3_REGION })

// Load resume log if specified
const processedKeys = new Set<string>()
if (resumeLog && existsSync(resumeLog)) {
  console.log(`📂 Loading resume log from ${resumeLog}`)
  const csvContent = readFileSync(resumeLog, 'utf-8')
  const records = parse(csvContent, { columns: true })
  for (const record of records) {
    if (record.status === 'OK') {
      processedKeys.add(`${record.bucket}/${record.key}`)
    }
  }
  console.log(`✅ Found ${processedKeys.size} already processed files`)
}

// Initialize CSV log
const logHeaders = 'bucket,key,status,error\n'
if (!existsSync(LOG_FILE) && !resumeLog) {
  appendFileSync(LOG_FILE, logHeaders)
} else if (resumeLog && resumeLog !== LOG_FILE && !existsSync(LOG_FILE)) {
  appendFileSync(LOG_FILE, logHeaders)
}

// Log entry function
function logEntry(bucket: string, key: string, status: string, error?: string) {
  const row = stringify([[bucket, key, status, error || '']])
  appendFileSync(LOG_FILE, row)
}

// Main migration function
async function migrateStorage() {
  console.log('🚀 Starting Storage Migration')
  console.log(`   Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`   Source: ${SUPABASE_URL}`)
  console.log(`   Target: S3 bucket ${S3_BUCKET || '(dry-run)'}`)
  if (prefix) console.log(`   Prefix filter: ${prefix}`)
  console.log('')

  let totalFiles = 0
  let skippedFiles = 0
  let successFiles = 0
  let failedFiles = 0

  try {
    // Get list of buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError || !buckets) {
      console.error('❌ Failed to list Supabase buckets:', bucketsError)
      return
    }

    console.log(`📦 Found ${buckets.length} buckets: ${buckets.map(b => b.name).join(', ')}\n`)

    // Process each bucket
    for (const bucket of buckets) {
      console.log(`\n📂 Processing bucket: ${bucket.name}`)
      
      let page = 0
      let hasMore = true
      const limit = 100

      while (hasMore) {
        // List files in bucket with pagination
        const { data: files, error: listError } = await supabase.storage
          .from(bucket.name)
          .list('', {
            limit: limit,
            offset: page * limit,
          })

        if (listError) {
          console.error(`❌ Error listing files in ${bucket.name}:`, listError)
          logEntry(bucket.name, '', 'FAIL', `List error: ${listError.message}`)
          hasMore = false
          continue
        }

        if (!files || files.length === 0) {
          hasMore = false
          continue
        }

        // Process each file
        for (const file of files) {
          // Skip if it's a folder
          if (file.name.endsWith('/')) {
            continue
          }

          totalFiles++
          const fileKey = file.name
          const fullKey = `${bucket.name}/${fileKey}`

          // Check prefix filter
          if (prefix && !fullKey.startsWith(prefix)) {
            console.log(`⏭️  Skipping ${fullKey} (prefix mismatch)`)
            skippedFiles++
            continue
          }

          // Check if already processed
          if (processedKeys.has(fullKey)) {
            console.log(`✓  Already processed: ${fullKey}`)
            skippedFiles++
            continue
          }

          // Process the file
          console.log(`📄 Processing: ${fullKey}`)

          if (isDryRun) {
            console.log(`   [DRY RUN] Would copy to s3://${S3_BUCKET}/${fullKey}`)
            logEntry(bucket.name, fileKey, 'DRY_RUN')
            successFiles++
          } else {
            try {
              // Download from Supabase
              const { data: fileData, error: downloadError } = await supabase.storage
                .from(bucket.name)
                .download(fileKey)

              if (downloadError || !fileData) {
                console.error(`   ❌ Download failed: ${downloadError?.message}`)
                logEntry(bucket.name, fileKey, 'FAIL', `Download: ${downloadError?.message}`)
                failedFiles++
                continue
              }

              // Convert Blob to Buffer
              const arrayBuffer = await fileData.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)

              // Upload to S3
              const putCommand = new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: fullKey,
                Body: buffer,
                ContentType: fileData.type || 'application/octet-stream',
                Metadata: {
                  'source': 'supabase-migration',
                  'original-bucket': bucket.name,
                  'migration-date': new Date().toISOString()
                }
              })

              await s3.send(putCommand)
              console.log(`   ✅ Copied to S3`)
              logEntry(bucket.name, fileKey, 'OK')
              successFiles++

            } catch (error: any) {
              console.error(`   ❌ Migration failed: ${error.message}`)
              logEntry(bucket.name, fileKey, 'FAIL', error.message)
              failedFiles++
            }
          }
        }

        // Check if there are more pages
        if (files.length < limit) {
          hasMore = false
        } else {
          page++
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Fatal error:', error)
  }

  // Print summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Migration Summary')
  console.log('='.repeat(50))
  console.log(`Total files found:    ${totalFiles}`)
  console.log(`Files migrated:       ${successFiles}`)
  console.log(`Files skipped:        ${skippedFiles}`)
  console.log(`Files failed:         ${failedFiles}`)
  console.log(`Log file:            ${LOG_FILE}`)
  
  if (isDryRun) {
    console.log('\n⚠️  This was a DRY RUN - no files were actually copied')
    console.log('Remove --dry-run to perform actual migration')
  }
}

// Handle recursive directory listing
async function listAllFiles(bucket: string, prefix: string = ''): Promise<any[]> {
  const allFiles: any[] = []
  
  const { data: items, error } = await supabase.storage
    .from(bucket)
    .list(prefix)

  if (error || !items) {
    return allFiles
  }

  for (const item of items) {
    if (item.name.endsWith('/')) {
      // It's a directory, recurse
      const subPath = prefix ? `${prefix}/${item.name}` : item.name
      const subFiles = await listAllFiles(bucket, subPath.replace(/\/$/, ''))
      allFiles.push(...subFiles.map(f => ({
        ...f,
        name: `${subPath.replace(/\/$/, '')}/${f.name}`
      })))
    } else {
      // It's a file
      allFiles.push({
        ...item,
        name: prefix ? `${prefix}/${item.name}` : item.name
      })
    }
  }

  return allFiles
}

// Enhanced migration with recursive listing
async function migrateStorageEnhanced() {
  console.log('🚀 Starting Storage Migration (Enhanced)')
  console.log(`   Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`   Source: ${SUPABASE_URL}`)
  console.log(`   Target: S3 bucket ${S3_BUCKET || '(dry-run)'}`)
  if (prefix) console.log(`   Prefix filter: ${prefix}`)
  console.log('')

  let totalFiles = 0
  let skippedFiles = 0
  let successFiles = 0
  let failedFiles = 0

  try {
    // Get list of buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError || !buckets) {
      console.error('❌ Failed to list Supabase buckets:', bucketsError)
      return
    }

    console.log(`📦 Found ${buckets.length} buckets: ${buckets.map(b => b.name).join(', ')}\n`)

    // Process each bucket
    for (const bucket of buckets) {
      console.log(`\n📂 Processing bucket: ${bucket.name}`)
      
      // Get all files recursively
      const files = await listAllFiles(bucket.name)
      console.log(`   Found ${files.length} files in bucket`)

      // Process each file
      for (const file of files) {
        totalFiles++
        const fileKey = file.name
        const fullKey = `${bucket.name}/${fileKey}`

        // Check prefix filter
        if (prefix && !fullKey.startsWith(prefix)) {
          skippedFiles++
          continue
        }

        // Check if already processed
        if (processedKeys.has(fullKey)) {
          console.log(`✓  Already processed: ${fullKey}`)
          skippedFiles++
          continue
        }

        // Process the file
        console.log(`📄 Processing: ${fullKey}`)

        if (isDryRun) {
          console.log(`   [DRY RUN] Would copy to s3://${S3_BUCKET}/${fullKey}`)
          logEntry(bucket.name, fileKey, 'DRY_RUN')
          successFiles++
        } else {
          try {
            // Download from Supabase
            const { data: fileData, error: downloadError } = await supabase.storage
              .from(bucket.name)
              .download(fileKey)

            if (downloadError || !fileData) {
              console.error(`   ❌ Download failed: ${downloadError?.message}`)
              logEntry(bucket.name, fileKey, 'FAIL', `Download: ${downloadError?.message}`)
              failedFiles++
              continue
            }

            // Convert Blob to Buffer
            const arrayBuffer = await fileData.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            // Upload to S3
            const putCommand = new PutObjectCommand({
              Bucket: S3_BUCKET,
              Key: fullKey,
              Body: buffer,
              ContentType: fileData.type || 'application/octet-stream',
              Metadata: {
                'source': 'supabase-migration',
                'original-bucket': bucket.name,
                'migration-date': new Date().toISOString()
              }
            })

            await s3.send(putCommand)
            console.log(`   ✅ Copied to S3`)
            logEntry(bucket.name, fileKey, 'OK')
            successFiles++

          } catch (error: any) {
            console.error(`   ❌ Migration failed: ${error.message}`)
            logEntry(bucket.name, fileKey, 'FAIL', error.message)
            failedFiles++
          }
        }
      }
    }

  } catch (error: any) {
    console.error('❌ Fatal error:', error)
  }

  // Print summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Migration Summary')
  console.log('='.repeat(50))
  console.log(`Total files found:    ${totalFiles}`)
  console.log(`Files migrated:       ${successFiles}`)
  console.log(`Files skipped:        ${skippedFiles}`)
  console.log(`Files failed:         ${failedFiles}`)
  console.log(`Log file:            ${LOG_FILE}`)
  
  if (isDryRun) {
    console.log('\n⚠️  This was a DRY RUN - no files were actually copied')
    console.log('Remove --dry-run to perform actual migration')
  }
}

// Run migration
console.log('Storage Migration Tool v1.0.0')
console.log(''.repeat(50))

// Use enhanced version for better recursive support
migrateStorageEnhanced().catch(console.error)