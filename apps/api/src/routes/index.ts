import { FastifyInstance } from 'fastify'
import { authRoutes } from './auth'
import { projectRoutes } from './projects'
import { deploymentRoutes } from './deployments'
import { domainRoutes } from './domains'
import { environmentRoutes } from './environment'
import { webhookRoutes } from './webhooks'
import { functionRoutes } from './functions'
import { sslRoutes } from './ssl'
import { analyticsRoutes } from './analytics'
import { authenticate } from '@/middleware/auth'

export async function setupRoutes(app: FastifyInstance) {
  // Public routes
  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(webhookRoutes, { prefix: '/api/webhooks' })

  // Protected routes (require authentication)
  app.register(
    async (app: FastifyInstance) => {
      app.addHook('preHandler', authenticate)

      // Register protected routes
      app.register(projectRoutes, { prefix: '/api/projects' })
      app.register(deploymentRoutes, { prefix: '/api/deployments' })
      app.register(domainRoutes, { prefix: '/api/domains' })
      app.register(environmentRoutes, { prefix: '/api/env' })
      app.register(functionRoutes, { prefix: '/api/functions' })
      app.register(sslRoutes, { prefix: '/api/ssl' })
      app.register(analyticsRoutes, { prefix: '/api/analytics' })
    },
    { prefix: '' }
  )

  // Public function routes (not protected for invocation)
  app.register(
    async (app: FastifyInstance) => {
      app.register(functionRoutes, { prefix: '/api/functions' })
    },
    { prefix: '' }
  )
}
