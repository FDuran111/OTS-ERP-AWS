import { NextResponse } from 'next/server'
import { z } from 'zod'

export interface ApiError {
  message: string
  code: string
  details?: any
  statusCode: number
}

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, 'CONFLICT', details)
    this.name = 'ConflictError'
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, 500, 'DATABASE_ERROR', details)
    this.name = 'DatabaseError'
  }
}

/**
 * Centralized error handler for API routes
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      },
      { status: 400 }
    )
  }

  // Handle custom app errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details
      },
      { status: error.statusCode }
    )
  }

  // Handle database connection errors
  if (error instanceof Error) {
    if (error.message.includes('ECONNREFUSED') || 
        error.message.includes('Can\'t reach database server')) {
      return NextResponse.json(
        {
          error: 'Database connection failed',
          code: 'DATABASE_CONNECTION_ERROR',
          details: 'The database server is not reachable. Please check your connection or try again later.'
        },
        { status: 503 }
      )
    }

    if (error.message.includes('password authentication failed')) {
      return NextResponse.json(
        {
          error: 'Database authentication failed',
          code: 'DATABASE_AUTH_ERROR',
          details: 'Database credentials are invalid.'
        },
        { status: 503 }
      )
    }

    if (error.message.includes('does not exist')) {
      return NextResponse.json(
        {
          error: 'Database schema error',
          code: 'DATABASE_SCHEMA_ERROR',
          details: 'Required database tables or columns may be missing.'
        },
        { status: 503 }
      )
    }
  }

  // Generic error fallback
  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : 'Please try again later or contact support.'
    },
    { status: 500 }
  )
}

/**
 * Wrapper for API route handlers with error handling
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      return handleApiError(error)
    }
  }
}

/**
 * Validates that required fields are present in request data
 */
export function validateRequired(data: any, fields: string[]): void {
  const missing = fields.filter(field => !data[field])
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missing.join(', ')}`,
      { missingFields: missing }
    )
  }
}

/**
 * Validates that an entity exists
 */
export function validateExists(entity: any, name: string = 'Entity'): void {
  if (!entity) {
    throw new NotFoundError(name)
  }
}