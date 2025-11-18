import Fastify from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyRateLimit from '@fastify/rate-limit'
import { config } from 'dotenv'

// Load environment variables
config()

import { prisma } from '@/lib/prisma'
import { setupRoutes } from '@/routes'
import { errorHandler } from '@/middleware/error-handler'
import { logger } from '@/lib/logger'

async function main() {
  const app = Fastify({
    logger: true,
  })

  try {
    // Register plugins
    await app.register(fastifyHelmet)
    await app.register(fastifyCors, {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    })

    // JWT authentication
    await app.register(fastifyJwt, {
      secret: process.env.JWT_SECRET || 'dev-secret-key',
      sign: { expiresIn: '7d' },
    })

    // Rate limiting
    await app.register(fastifyRateLimit, {
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      timeWindow: process.env.RATE_LIMIT_WINDOW_MS || '15 minutes',
    })

    // Health check endpoint
    app.get('/health', async (request, reply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
      }
    })

    // Setup routes
    await setupRoutes(app)

    // Register error handler
    app.setErrorHandler(errorHandler)

    // Start server
    const port = parseInt(process.env.API_PORT || '9000')
    const host = process.env.API_HOST || '0.0.0.0'

    await app.listen({ port, host })

    logger.info(`✓ API Server running on http://${host}:${port}`)
    logger.info(`✓ Environment: ${process.env.NODE_ENV}`)
  } catch (err) {
    logger.error(err)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

main()
