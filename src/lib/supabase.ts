import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xudcmdliqyarbfdqufbq.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Create a Supabase client with the service role key for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper function to execute raw SQL queries similar to pg's query function
export async function query(text: string, params?: any[]): Promise<any> {
  const start = Date.now()
  
  try {
    // Use Supabase's rpc function to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: text,
      params: params || []
    })
    
    if (error) throw error
    
    const duration = Date.now() - start
    
    if (process.env.NODE_ENV === 'development') {
      console.log({
        query: text,
        params: params ? `[${params.length} params]` : 'none',
        duration: `${duration}ms`,
        rowCount: data?.length || 0
      })
    }
    
    return {
      rows: data || [],
      rowCount: data?.length || 0
    }
  } catch (error: any) {
    console.error('Database query error:', {
      query: text,
      params: params ? `[${params.length} params]` : 'none', 
      duration: `${Date.now() - start}ms`,
      error: error.message,
      code: error.code
    })
    
    const enhancedError = new Error(`Database query failed: ${error.message}`)
    enhancedError.name = 'DatabaseQueryError'
    const errorWithContext = enhancedError as any
    errorWithContext.originalError = error
    errorWithContext.query = text
    errorWithContext.params = params
    
    throw errorWithContext
  }
}