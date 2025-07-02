import { runAllMigrations } from './db-migrations/migration-runner'

let initialized = false

export async function initializeApp() {
  if (initialized) {
    console.log('App already initialized')
    return
  }
  
  try {
    console.log('🚀 Starting application initialization...')
    
    // Run database migrations
    if (process.env.RUN_MIGRATIONS_ON_STARTUP === 'true') {
      console.log('📦 Running database migrations...')
      try {
        await runAllMigrations()
        console.log('✅ Database migrations completed')
      } catch (error) {
        console.error('❌ Migration failed:', error)
        // In production, you might want to exit the process here
        if (process.env.NODE_ENV === 'production') {
          console.error('Fatal: Cannot start without successful migrations')
          process.exit(1)
        }
      }
    }
    
    // Add other initialization tasks here
    // - Cache warming
    // - External service connections
    // - Feature flag initialization
    // etc.
    
    initialized = true
    console.log('✅ Application initialization completed')
  } catch (error) {
    console.error('❌ Application initialization failed:', error)
    throw error
  }
}

// Initialize on module load in development
if (process.env.NODE_ENV === 'development') {
  initializeApp().catch(console.error)
}