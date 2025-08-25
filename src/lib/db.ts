import { Pool } from 'pg'
import type { UserRole } from './auth'
import { assertEnvIsolation, logEnvIsolationStatus } from './assertEnvIsolation'

// Check if we're in an AWS-only environment
const isAwsEnv = ['staging', 'production'].includes(process.env.NEXT_PUBLIC_ENV ?? '')

// Verify RDS for AWS environments
function verifyRdsDatabase(): void {
  if (!isAwsEnv) return
  
  const dbUrl = process.env.DATABASE_URL || ''
  
  // Parse hostname from DATABASE_URL
  let hostname = ''
  try {
    const url = new URL(dbUrl.replace('postgresql://', 'https://'))
    hostname = url.hostname
  } catch (error) {
    throw new Error(
      `Invalid DATABASE_URL format in ${process.env.NEXT_PUBLIC_ENV} environment`
    )
  }
  
  // Check if it's an RDS endpoint
  if (!hostname.toLowerCase().endsWith('.rds.amazonaws.com')) {
    throw new Error(
      `CONFIGURATION ERROR: ${process.env.NEXT_PUBLIC_ENV} environment MUST use AWS RDS. ` +
      `Current database host: ${hostname}. ` +
      `Expected: *.rds.amazonaws.com. ` +
      `Staging and production are locked to AWS services only.`
    )
  }
  
  console.log(`✅ Database verified: AWS RDS (${hostname})`)
}

// Check environment isolation before initializing database
assertEnvIsolation()
logEnvIsolationStatus()
verifyRdsDatabase()

// Simple PostgreSQL connection pool with retry logic
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Simple connection settings for Supabase
  max: 10, // Increase max connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 30000, // Increase to 30s connection timeout
  // Add retry logic for DNS issues
  query_timeout: 60000, // Increase to 60s query timeout
  statement_timeout: 60000, // Increase to 60s statement timeout
})

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err)
})

// Enhanced query function with better error handling
export async function query(text: string, params?: any[]) {
  const start = Date.now()
  
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { 
        text: text.replace(/\s+/g, ' ').trim(), 
        duration: `${duration}ms`, 
        rows: result.rowCount 
      })
    }
    
    return result
  } catch (error: any) {
    const duration = Date.now() - start
    
    console.error('Database query error:', {
      query: text.replace(/\s+/g, ' ').trim(),
      params: params?.length ? `[${params.length} params]` : 'none',
      duration: `${duration}ms`,
      error: error.message,
      code: error.code
    })
    
    // Re-throw with more context
    const enhancedError = new Error(`Database query failed: ${error.message}`)
    enhancedError.name = 'DatabaseQueryError'
    const errorWithContext = enhancedError as any
    errorWithContext.originalError = error
    errorWithContext.query = text
    errorWithContext.params = params
    
    throw enhancedError
  }
}

// Test connection
export async function testConnection() {
  try {
    await query('SELECT 1')
    return true
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}

// Get database client connection
export async function connectToDatabase() {
  const client = await pool.connect()
  return { client }
}

// Close all connections (for cleanup)
export async function closePool() {
  await pool.end()
}

// Types for our main entities (much simpler than Prisma!)
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Job {
  id: string
  job_number: string
  description: string
  status: string
  customer_id: string
  estimated_hours?: number
  actual_hours?: number
  estimated_amount?: number
  billed_amount?: number
  billed_date?: Date
  created_at: Date
  updated_at: Date
}

export interface Customer {
  id: string
  first_name: string
  last_name: string
  company_name?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  created_at: Date
  updated_at: Date
}

export interface Material {
  id: string
  code: string
  name: string
  description?: string
  manufacturer?: string
  category: string
  unit: string
  in_stock: number
  min_stock: number
  cost: number
  price: number
  location?: string
  active: boolean
  vendor_id?: string
  created_at: Date
  updated_at: Date
}

export interface Lead {
  id: string
  first_name: string
  last_name: string
  company_name?: string
  email?: string
  phone?: string
  status: string
  source?: string
  estimated_value?: number
  priority?: string
  description?: string
  last_contact_date?: Date
  next_follow_up_date?: Date
  assigned_to?: string
  created_at: Date
  updated_at: Date
}