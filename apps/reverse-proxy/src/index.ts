import Fastify from 'fastify'
import fastifyHttpProxy from 'fastify-http-proxy'
import helmet from '@fastify/helmet'
import { DomainRouter } from './services/domain-router'
import { MinIOService } from './services/minio'
import { SSLManager } from './services/ssl-manager'
import { logger } from './lib/logger'

require('dotenv').config()

const app = Fastify({
  logger: false,
  trustProxy: true,
})

// Security headers
app.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourceSharing: false,
})

// Services
const minioService = new MinIOService()
const sslManager = new SSLManager()
const domainRouter = new DomainRouter()

// Request tracking
let totalRequests = 0
let failedRequests = 0

// Health check endpoint
app.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    uptime: process.uptime(),
    totalRequests,
    failedRequests,
  }
})

// Main request handler
app.all('/:path*', async (request, reply) => {
  totalRequests++

  try {
    const host = request.hostname || request.headers.host || ''
    const path = request.url.split('?')[0]

    logger.info(`Request: ${request.method} ${host}${path}`)

    // Extract domain and deployment
    const routingInfo = await domainRouter.resolveRequest(
      host,
      request.url,
      request.method as string,
      request.headers,
      request.body as any
    )

    if (!routingInfo.success) {
      logger.warn(`Routing failed for ${host}: ${routingInfo.error}`)
      return reply.status(404).send({
        error: 'Not found',
        message: routingInfo.error,
        documentation: 'https://vercel-clone.com/docs',
      })
    }

    // Route to MinIO bucket
    const { deploymentId, projectId } = routingInfo

    logger.info(`Routing ${host} → project:${projectId}, deployment:${deploymentId}`)

    // Get presigned URL from MinIO
    const presignedUrl = await minioService.getPresignedUrl(
      projectId,
      deploymentId,
      path
    )

    if (!presignedUrl) {
      logger.error(`Failed to get presigned URL for ${projectId}/${deploymentId}${path}`)
      return reply.status(404).send({
        error: 'Deployment not found',
      })
    }

    // Proxy the request to MinIO
    logger.debug(`Proxying to MinIO: ${presignedUrl}`)

    // Use fastify-http-proxy to forward the request
    return fastifyProxyRequest(request, reply, presignedUrl)
  } catch (error) {
    failedRequests++
    logger.error(`Request failed: ${(error as Error).message}`)
    return reply.status(500).send({
      error: 'Internal server error',
      message: (error as Error).message,
    })
  }
})

// Simple proxy helper
async function fastifyProxyRequest(
  request: any,
  reply: any,
  targetUrl: string
) {
  try {
    const axios = require('axios')

    const response = await axios({
      method: request.method.toLowerCase(),
      url: targetUrl,
      headers: {
        ...request.headers,
        host: new URL(targetUrl).hostname,
      },
      data: request.body,
      maxRedirects: 5,
      validateStatus: () => true,
    })

    reply.status(response.status)

    // Copy response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      if (
        ![
          'content-encoding',
          'transfer-encoding',
          'connection',
          'vary',
        ].includes(key.toLowerCase())
      ) {
        reply.header(key, value)
      }
    })

    return reply.send(response.data)
  } catch (error) {
    logger.error(`Proxy request failed: ${(error as Error).message}`)
    return reply.status(503).send({
      error: 'Service unavailable',
      message: 'Could not reach deployment',
    })
  }
}

// Start server
const start = async () => {
  try {
    await minioService.initialize()
    logger.info('MinIO service initialized')

    await sslManager.initialize()
    logger.info('SSL manager initialized')

    await domainRouter.initialize()
    logger.info('Domain router initialized')

    // Listen on both HTTP and HTTPS
    const httpPort = parseInt(process.env.HTTP_PORT || '3000')
    const httpsPort = parseInt(process.env.HTTPS_PORT || '3001')

    await app.listen({ port: httpPort, host: '0.0.0.0' })
    logger.info(`HTTP server listening on port ${httpPort}`)

    // Note: HTTPS setup will be added in Phase 8
    logger.info('Reverse proxy started successfully')
  } catch (error) {
    logger.error(`Failed to start server: ${(error as Error).message}`)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await app.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await app.close()
  process.exit(0)
})

start()

export default app
