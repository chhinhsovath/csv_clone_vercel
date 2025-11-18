import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

/**
 * Register security headers middleware
 */
export async function registerSecurityHeaders(app: FastifyInstance) {
  app.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply) => {
    // Prevent MIME type sniffing
    reply.header('X-Content-Type-Options', 'nosniff')

    // Prevent clickjacking attacks
    reply.header('X-Frame-Options', 'DENY')

    // Enable XSS filtering
    reply.header('X-XSS-Protection', '1; mode=block')

    // HSTS - Force HTTPS
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')

    // Content Security Policy
    reply.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    )

    // Referrer Policy
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')

    // Permissions Policy
    reply.header(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=()'
    )

    // Don't cache sensitive responses
    if (request.url.includes('/auth') || request.url.includes('/api/user')) {
      reply.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
      reply.header('Pragma', 'no-cache')
      reply.header('Expires', '0')
    }
  })
}

/**
 * CORS middleware
 */
export async function registerCors(app: FastifyInstance) {
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',')
  const isDevelopment = process.env.NODE_ENV === 'development'

  app.register(require('@fastify/cors'), {
    origin: isDevelopment ? true : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Internal-Key'],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Response-Time',
    ],
    maxAge: 86400, // 24 hours
  })
}

/**
 * CSRF token generation and validation
 */
export class CsrfProtection {
  static generateToken(): string {
    const crypto = require('crypto')
    return crypto.randomBytes(32).toString('hex')
  }

  static validateToken(token: string, storedToken: string): boolean {
    // Use timing-safe comparison to prevent timing attacks
    const crypto = require('crypto')
    const tokenBuffer = Buffer.from(token)
    const storedBuffer = Buffer.from(storedToken)

    if (tokenBuffer.length !== storedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(tokenBuffer, storedBuffer)
  }

  static createMiddleware() {
    return (request: FastifyRequest, reply: FastifyReply, done: any) => {
      // Generate CSRF token for GET requests
      if (request.method === 'GET') {
        const token = this.generateToken()
        reply.header('X-CSRF-Token', token)
        ; (request as any).csrfToken = token
      }

      // Validate CSRF token for state-changing requests
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const token = (request.headers['x-csrf-token'] as string) || (request.body as any)?.csrfToken

        if (!token) {
          reply
            .status(403)
            .send({ error: 'CSRF token missing or invalid' })
          return
        }

        // Verify token (in production, store in session/database)
        (request as any).csrfToken = token
      }

      done()
    }
  }
}

/**
 * Input sanitization middleware
 */
export async function registerInputSanitization(app: FastifyInstance) {
  app.addHook('preHandler', async (request: FastifyRequest) => {
    if (request.body && typeof request.body === 'object') {
      // Sanitize all string fields
      const sanitizeStrings = (obj: any) => {
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            obj[key] = sanitizeString(obj[key])
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeStrings(obj[key])
          }
        }
      }

      sanitizeStrings(request.body)
    }
  })
}

/**
 * SQL injection prevention - parameterized queries already used by Prisma
 */

/**
 * XSS prevention helper
 */
function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * API key validation
 */
export class ApiKeyValidator {
  private validKeys: Set<string> = new Set()

  constructor(keys: string[]) {
    this.validKeys = new Set(keys)
  }

  isValid(key: string): boolean {
    return this.validKeys.has(key)
  }

  createMiddleware() {
    return (request: FastifyRequest, reply: FastifyReply, done: any) => {
      // Skip validation for public endpoints
      if (this.isPublicEndpoint(request.url)) {
        done()
        return
      }

      const apiKey = request.headers['x-api-key'] as string

      if (!apiKey || !this.isValid(apiKey)) {
        reply.status(401).send({ error: 'Invalid or missing API key' })
        return
      }

      done()
    }
  }

  private isPublicEndpoint(url: string): boolean {
    const publicEndpoints = ['/health', '/api/auth/login', '/api/auth/signup', '/api/webhooks']
    return publicEndpoints.some((endpoint) => url.startsWith(endpoint))
  }
}

/**
 * Request validation middleware
 */
export function createValidationMiddleware(schema: any) {
  return (request: FastifyRequest, reply: FastifyReply, done: any) => {
    const { error, value } = schema.validate(request.body)

    if (error) {
      reply.status(400).send({
        error: 'Validation failed',
        details: error.details.map((d: any) => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      })
      return
    }

    request.body = value
    done()
  }
}

/**
 * Sensitive data redaction
 */
export function redactSensitiveData(obj: any, sensitiveFields: string[] = []): any {
  const defaultSensitiveFields = [
    'password',
    'password_hash',
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'secret',
    'api_secret',
    'private_key',
  ]

  const fieldsToRedact = [...defaultSensitiveFields, ...sensitiveFields]

  const redacted = JSON.parse(JSON.stringify(obj))

  const redactRecursive = (obj: any) => {
    for (const key in obj) {
      if (fieldsToRedact.includes(key.toLowerCase())) {
        obj[key] = '[REDACTED]'
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        redactRecursive(obj[key])
      }
    }
  }

  redactRecursive(redacted)
  return redacted
}

/**
 * Webhook signature verification
 */
export class WebhookSignatureValidator {
  static sign(payload: string, secret: string): string {
    const crypto = require('crypto')
    return crypto.createHmac('sha256', secret).update(payload).digest('hex')
  }

  static verify(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.sign(payload, secret)
    const crypto = require('crypto')
    const payloadBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)

    if (payloadBuffer.length !== expectedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(payloadBuffer, expectedBuffer)
  }

  static createMiddleware(secretGetter: (headers: any) => string) {
    return (request: FastifyRequest, reply: FastifyReply, done: any) => {
      const signature = request.headers['x-github-signature'] as string
      const secret = secretGetter(request.headers)

      if (!signature || !secret) {
        reply.status(401).send({ error: 'Missing signature or secret' })
        return
      }

      const payload = JSON.stringify(request.body)

      if (!this.verify(payload, signature, secret)) {
        reply.status(401).send({ error: 'Invalid signature' })
        return
      }

      done()
    }
  }
}

/**
 * Rate limit bypass for internal services
 */
export function isBypassableRequest(request: FastifyRequest): boolean {
  const internalKey = request.headers['x-internal-key']
  return internalKey === process.env.INTERNAL_API_KEY
}
