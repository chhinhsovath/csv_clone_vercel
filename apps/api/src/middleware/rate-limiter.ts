import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createClient } from 'redis'

interface RateLimiterConfig {
  max?: number // max requests per window
  timeWindow?: number // time window in seconds (default: 60)
  keyPrefix?: string // Redis key prefix
  skipFailedRequests?: boolean // Don't count failed requests
  skipSuccessfulRequests?: boolean // Don't count successful requests
}

interface RateLimitInfo {
  remaining: number
  limit: number
  resetTime: number
}

let redisClient: ReturnType<typeof createClient> | null = null

/**
 * Initialize Redis connection for rate limiting
 */
export async function initializeRateLimiter(): Promise<void> {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
    redisClient = createClient({ url: redisUrl })

    redisClient.on('error', (err) => console.log('Redis Client Error', err))
    redisClient.on('connect', () => console.log('Rate limiter Redis connected'))

    await redisClient.connect()
  } catch (error) {
    console.error('Failed to initialize rate limiter:', error)
  }
}

/**
 * Register rate limiter middleware on Fastify instance
 */
export async function registerRateLimiter(
  app: FastifyInstance,
  config: RateLimiterConfig = {}
): Promise<void> {
  const {
    max = 100, // 100 requests per window
    timeWindow = 60, // 60 seconds
    keyPrefix = 'rl:',
    skipFailedRequests = false,
    skipSuccessfulRequests = false,
  } = config

  // List of endpoints exempt from rate limiting
  const exemptEndpoints = [
    '/health',
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/github/callback',
    '/api/webhooks',
  ]

  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip rate limiting for exempt endpoints
    const isExempt = exemptEndpoints.some((endpoint) =>
      request.url.startsWith(endpoint)
    )

    if (isExempt || !redisClient) {
      return
    }

    try {
      // Use userId if authenticated, otherwise use IP address
      const key = `${keyPrefix}${(request as any).userId || request.ip}`
      const now = Math.floor(Date.now() / 1000)
      const windowStart = now - timeWindow

      // ZADD adds the request timestamp to the sorted set
      // ZREMRANGEBYSCORE removes entries older than the time window
      // ZCARD gets the count of requests in the window
      const [, , requestCount] = await Promise.all([
        redisClient.zAdd(key, { score: now, value: `${now}-${Math.random()}` }),
        redisClient.zRemRangeByScore(key, '-inf', windowStart),
        redisClient.zCard(key),
      ])

      // Set expiry on the key
      await redisClient.expire(key, timeWindow)

      const remaining = Math.max(0, max - requestCount)
      const resetTime = now + timeWindow

      // Add rate limit headers to response
      reply.header('X-RateLimit-Limit', max.toString())
      reply.header('X-RateLimit-Remaining', remaining.toString())
      reply.header('X-RateLimit-Reset', resetTime.toString())

      // Check if limit exceeded
      if (requestCount > max) {
        return reply
          .status(429)
          .header('Retry-After', timeWindow.toString())
          .send({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Maximum ${max} requests per ${timeWindow} seconds.`,
            retryAfter: timeWindow,
            remaining: 0,
            limit: max,
            resetTime,
          })
      }
    } catch (error) {
      console.error('Rate limiter error:', error)
      // Don't block requests on rate limiter errors
    }
  })

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!redisClient) return

    // Skip failed/successful requests if configured
    const statusCode = reply.statusCode

    if (skipFailedRequests && statusCode >= 400) {
      return
    }

    if (skipSuccessfulRequests && statusCode < 400) {
      return
    }
  })
}

/**
 * Get rate limit info for a user/IP
 */
export async function getRateLimitInfo(
  identifier: string,
  config: RateLimiterConfig = {}
): Promise<RateLimitInfo | null> {
  if (!redisClient) return null

  try {
    const { max = 100, timeWindow = 60, keyPrefix = 'rl:' } = config
    const key = `${keyPrefix}${identifier}`

    const requestCount = await redisClient.zCard(key)
    const ttl = await redisClient.ttl(key)

    return {
      remaining: Math.max(0, max - requestCount),
      limit: max,
      resetTime: Math.floor(Date.now() / 1000) + Math.max(0, ttl),
    }
  } catch (error) {
    console.error('Failed to get rate limit info:', error)
    return null
  }
}

/**
 * Reset rate limit for a user/IP
 */
export async function resetRateLimit(
  identifier: string,
  keyPrefix: string = 'rl:'
): Promise<boolean> {
  if (!redisClient) return false

  try {
    const key = `${keyPrefix}${identifier}`
    await redisClient.del(key)
    return true
  } catch (error) {
    console.error('Failed to reset rate limit:', error)
    return false
  }
}

/**
 * Cleanup - disconnect Redis
 */
export async function closeRateLimiter(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit()
    } catch (error) {
      console.error('Error closing rate limiter:', error)
    }
  }
}
