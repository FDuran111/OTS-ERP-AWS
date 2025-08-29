import { Pool } from 'pg'
import type { UserRole } from './auth'

/**
 * Database Driver Configuration
 * Supports both Supabase (via DATABASE_URL) and AWS RDS (via explicit config)
 */
const DB_DRIVER = (process.env.DB_DRIVER || 'SUPABASE').toUpperCase()

// Create pool based on driver configuration
function createPool(): Pool {
  if (DB_DRIVER === 'RDS') {
    // AWS RDS configuration with explicit parameters
    // Support both RDS_ENDPOINT (direct) and RDS_PROXY_ENDPOINT
    const rdsHost = process.env.RDS_ENDPOINT || process.env.RDS_PROXY_ENDPOINT
    if (!rdsHost) {
      throw new Error('RDS_ENDPOINT or RDS_PROXY_ENDPOINT is required when DB_DRIVER=RDS')
    }
    
    return new Pool({
      host: rdsHost,
      port: 5432,
      database: process.env.RDS_DB || 'ortmeier',
      user: process.env.RDS_USER,
      password: process.env.RDS_PASSWORD,
      ssl: { rejectUnauthorized: false }, // Set to false for public RDS
      max: 10,
      idleTimeoutMillis: 30000, // 30 seconds for direct RDS
      connectionTimeoutMillis: 5000, // 5 seconds for RDS
    })
  } else {
    // Supabase/Standard PostgreSQL configuration
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required when DB_DRIVER=SUPABASE')
    }
    
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      // Simple connection settings for Supabase
      max: 10,
      idleTimeoutMillis: 30000, // 30s for Supabase
      connectionTimeoutMillis: 30000, // 30s for Supabase
      // Add retry logic for DNS issues
      query_timeout: 60000,
      statement_timeout: 60000,
    })
  }
}

// Initialize the pool
const pool = createPool()

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err)
})

// Export the pool for direct access if needed
export { pool }

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

// Health check function for monitoring
export async function healthCheck(): Promise<{ ok: boolean; error?: string; driver?: string }> {
  try {
    const result = await query('SELECT 1 as health_check')
    if (result.rows && result.rows[0]?.health_check === 1) {
      return { ok: true, driver: DB_DRIVER }
    }
    return { ok: false, error: 'Unexpected query result', driver: DB_DRIVER }
  } catch (error: any) {
    console.error('Database health check failed:', error)
    return { 
      ok: false, 
      error: error.message || 'Unknown database error',
      driver: DB_DRIVER 
    }
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