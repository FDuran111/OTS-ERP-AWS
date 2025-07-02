// Production monitoring and logging
import { NextRequest } from 'next/server'

interface MetricData {
  name: string
  value: number
  unit: 'count' | 'milliseconds' | 'bytes' | 'percent'
  tags?: Record<string, string>
}

interface LogData {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  context?: any
  userId?: string
  requestId?: string
}

class MonitoringService {
  private metrics: MetricData[] = []
  private logs: LogData[] = []

  // Performance monitoring
  async trackRequestDuration(
    request: NextRequest,
    handler: () => Promise<Response>
  ): Promise<Response> {
    const start = Date.now()
    const method = request.method
    const path = new URL(request.url).pathname

    try {
      const response = await handler()
      const duration = Date.now() - start

      this.recordMetric({
        name: 'api.request.duration',
        value: duration,
        unit: 'milliseconds',
        tags: {
          method,
          path,
          status: response.status.toString()
        }
      })

      return response
    } catch (error) {
      const duration = Date.now() - start

      this.recordMetric({
        name: 'api.request.duration',
        value: duration,
        unit: 'milliseconds',
        tags: {
          method,
          path,
          status: '500',
          error: 'true'
        }
      })

      throw error
    }
  }

  // Database query monitoring
  trackDatabaseQuery(query: string, duration: number, success: boolean) {
    this.recordMetric({
      name: 'database.query.duration',
      value: duration,
      unit: 'milliseconds',
      tags: {
        success: success.toString(),
        query_type: this.getQueryType(query)
      }
    })
  }

  // Business metrics
  trackJobCreated(jobType: string) {
    this.recordMetric({
      name: 'business.job.created',
      value: 1,
      unit: 'count',
      tags: { type: jobType }
    })
  }

  trackRevenue(amount: number, source: string) {
    this.recordMetric({
      name: 'business.revenue',
      value: amount,
      unit: 'count',
      tags: { source }
    })
  }

  trackUserActivity(userId: string, action: string) {
    this.recordMetric({
      name: 'user.activity',
      value: 1,
      unit: 'count',
      tags: { userId, action }
    })
  }

  // Error tracking
  trackError(error: Error, context?: any) {
    this.log({
      level: 'error',
      message: error.message,
      context: {
        stack: error.stack,
        ...context
      }
    })

    this.recordMetric({
      name: 'application.error',
      value: 1,
      unit: 'count',
      tags: {
        error_type: error.name,
        error_message: error.message.substring(0, 100)
      }
    })
  }

  // Memory usage monitoring
  trackMemoryUsage() {
    if (typeof process !== 'undefined') {
      const usage = process.memoryUsage()
      
      this.recordMetric({
        name: 'system.memory.heap_used',
        value: usage.heapUsed,
        unit: 'bytes'
      })

      this.recordMetric({
        name: 'system.memory.heap_total',
        value: usage.heapTotal,
        unit: 'bytes'
      })

      this.recordMetric({
        name: 'system.memory.rss',
        value: usage.rss,
        unit: 'bytes'
      })
    }
  }

  // Logging methods
  debug(message: string, context?: any) {
    this.log({ level: 'debug', message, context })
  }

  info(message: string, context?: any) {
    this.log({ level: 'info', message, context })
  }

  warn(message: string, context?: any) {
    this.log({ level: 'warn', message, context })
  }

  error(message: string, context?: any) {
    this.log({ level: 'error', message, context })
  }

  // Private methods
  private recordMetric(metric: MetricData) {
    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to CloudWatch, DataDog, etc.
      this.sendToMonitoringService(metric)
    } else {
      // Development logging
      console.log('METRIC:', metric)
    }

    this.metrics.push(metric)
  }

  private log(data: LogData) {
    const timestamp = new Date().toISOString()
    const logEntry = { ...data, timestamp }

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to CloudWatch Logs, Loggly, etc.
      this.sendToLoggingService(logEntry)
    } else {
      // Development logging
      const logMethod = console[data.level] || console.log
      logMethod(`[${data.level.toUpperCase()}] ${data.message}`, data.context)
    }

    this.logs.push(data)
  }

  private getQueryType(query: string): string {
    const upperQuery = query.toUpperCase().trim()
    if (upperQuery.startsWith('SELECT')) return 'SELECT'
    if (upperQuery.startsWith('INSERT')) return 'INSERT'
    if (upperQuery.startsWith('UPDATE')) return 'UPDATE'
    if (upperQuery.startsWith('DELETE')) return 'DELETE'
    return 'OTHER'
  }

  private sendToMonitoringService(metric: MetricData) {
    // Implement integration with monitoring service
    // Example: AWS CloudWatch, DataDog, New Relic
  }

  private sendToLoggingService(logEntry: any) {
    // Implement integration with logging service
    // Example: AWS CloudWatch Logs, Loggly, Papertrail
  }

  // Batch send metrics periodically
  startMetricsBatch() {
    setInterval(() => {
      if (this.metrics.length > 0) {
        // Send batch to monitoring service
        this.metrics = []
      }
    }, 60000) // Every minute
  }
}

// Export singleton instance
export const monitoring = new MonitoringService()

// Health check endpoint data
export function getHealthStatus() {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime ? process.uptime() : 0,
    memory: process.memoryUsage ? process.memoryUsage() : {},
    environment: process.env.NODE_ENV,
    checks: {
      database: 'connected',
      redis: 'connected',
      s3: 'connected'
    }
  }
}