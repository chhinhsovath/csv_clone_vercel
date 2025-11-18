import { FastifyReply } from 'fastify'

/**
 * Pagination utilities and helpers
 */
export interface PaginationParams {
  limit?: number
  offset?: number
  page?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    total: number
    limit: number
    offset: number
    page: number
    pages: number
  }
}

/**
 * Parse pagination parameters from query
 */
export function parsePaginationParams(query: any): { limit: number; offset: number } {
  let limit = Math.min(Math.max(parseInt(query.limit) || 20, 1), 100)
  let offset = Math.max(parseInt(query.offset) || 0, 0)

  // If page is provided, calculate offset
  if (query.page) {
    const page = Math.max(parseInt(query.page), 1)
    offset = (page - 1) * limit
  }

  return { limit, offset }
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): PaginatedResponse<T> {
  const page = Math.floor(offset / limit) + 1
  const pages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      total,
      limit,
      offset,
      page,
      pages,
    },
  }
}

/**
 * Set caching headers for responses
 */
export function setCacheHeaders(
  reply: FastifyReply,
  options: {
    type: 'public' | 'private'
    maxAge?: number // seconds
    mustRevalidate?: boolean
    noStore?: boolean
    immutable?: boolean
  }
) {
  let cacheControl = options.type

  if (options.noStore) {
    cacheControl = 'no-store'
  } else if (options.maxAge) {
    cacheControl += `, max-age=${options.maxAge}`
  }

  if (options.mustRevalidate) {
    cacheControl += ', must-revalidate'
  }

  if (options.immutable) {
    cacheControl += ', immutable'
  }

  reply.header('Cache-Control', cacheControl)
}

/**
 * Set CORS headers
 */
export function setCorsHeaders(reply: FastifyReply) {
  reply.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*')
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH')
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  reply.header('Access-Control-Max-Age', '86400')
}

/**
 * Set security headers
 */
export function setSecurityHeaders(reply: FastifyReply) {
  reply.header('X-Content-Type-Options', 'nosniff')
  reply.header('X-Frame-Options', 'DENY')
  reply.header('X-XSS-Protection', '1; mode=block')
  reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  reply.header('Content-Security-Policy', "default-src 'self'")
}

/**
 * Compress large objects for transmission
 */
export function compressResponse(data: any): Buffer {
  return Buffer.from(JSON.stringify(data))
}

/**
 * Standardized error response
 */
export function createErrorResponse(
  status: number,
  error: string,
  details?: any
) {
  return {
    success: false,
    error,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  }
}

/**
 * Standardized success response
 */
export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  }
}

/**
 * Response wrapper for consistent formatting
 */
export class ResponseFormatter {
  static success<T>(data: T, message?: string) {
    return {
      success: true,
      data,
      message,
    }
  }

  static paginated<T>(
    data: T[],
    total: number,
    limit: number,
    offset: number
  ) {
    const page = Math.floor(offset / limit) + 1
    const pages = Math.ceil(total / limit)

    return {
      success: true,
      data,
      pagination: { total, limit, offset, page, pages },
    }
  }

  static error(message: string, details?: any) {
    return {
      success: false,
      error: message,
      details,
    }
  }

  static list<T>(items: T[], total: number, page: number = 1, pageSize: number = 20) {
    return {
      success: true,
      items,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  }
}

/**
 * Middleware to add response time header
 */
export function createResponseTimeMiddleware() {
  return (request: any, reply: any, done: any) => {
    const start = Date.now()

    const originalSend = reply.send

    reply.send = function (payload: any) {
      const duration = Date.now() - start
      reply.header('X-Response-Time', `${duration}ms`)
      return originalSend.call(this, payload)
    }

    done()
  }
}

/**
 * Query result mapper to select specific fields
 */
export function selectFields<T extends Record<string, any>>(
  objects: T[],
  fields: string[]
): Partial<T>[] {
  return objects.map((obj) => {
    const selected: any = {}
    fields.forEach((field) => {
      if (field in obj) {
        selected[field] = obj[field]
      }
    })
    return selected
  })
}

/**
 * Batch processing utility
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)
  }

  return results
}

/**
 * Rate limit response helper
 */
export function getRateLimitHeaders(remaining: number, limit: number, resetTime: number) {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toString(),
  }
}
