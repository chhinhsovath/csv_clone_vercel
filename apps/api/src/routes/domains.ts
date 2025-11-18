import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

export async function domainRoutes(app: FastifyInstance) {
  /**
   * Get domains for a project
   * GET /api/domains/projects/:projectId
   */
  app.get(
    '/projects/:projectId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId } = request.params as { projectId: string }
        const userId = (request as any).userId

        // Verify project ownership
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, user_id: true, team_id: true },
        })

        if (!project) {
          return reply.status(404).send({ error: 'Project not found' })
        }

        // Check authorization
        if (project.user_id !== userId && project.team_id) {
          const isMember = await prisma.team_member.findFirst({
            where: {
              team_id: project.team_id,
              user_id: userId,
            },
          })

          if (!isMember) {
            return reply.status(403).send({ error: 'Unauthorized' })
          }
        } else if (project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        // Get domains
        const domains = await prisma.domain.findMany({
          where: { project_id: projectId },
          select: {
            id: true,
            domain_name: true,
            is_verified: true,
            ssl_status: true,
            ssl_expires_at: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
        })

        return reply.send({
          success: true,
          domains,
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to fetch domains',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Resolve domain for reverse proxy
   * GET /api/domains/resolve/:hostname
   * Used by reverse proxy to find deployment
   */
  app.get('/resolve/:hostname', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { hostname } = request.params as { hostname: string }

      // Look up custom domain
      const domain = await prisma.domain.findUnique({
        where: { domain_name: hostname },
        select: {
          project_id: true,
          is_verified: true,
        },
      })

      if (!domain || !domain.is_verified) {
        return reply.status(404).send({
          success: false,
          error: 'Domain not found or not verified',
        })
      }

      // Get latest deployment for the project
      const deployment = await prisma.deployment.findFirst({
        where: {
          project_id: domain.project_id,
          status: 'success',
        },
        select: {
          id: true,
          project_id: true,
        },
        orderBy: { created_at: 'desc' },
      })

      if (!deployment) {
        return reply.status(404).send({
          success: false,
          error: 'No successful deployment found',
        })
      }

      return reply.send({
        success: true,
        projectId: deployment.project_id,
        deploymentId: deployment.id,
      })
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Failed to resolve domain',
        message: (error as Error).message,
      })
    }
  })

  /**
   * Create custom domain
   * POST /api/domains/projects/:projectId
   */
  app.post(
    '/projects/:projectId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId } = request.params as { projectId: string }
        const { domain_name } = request.body as { domain_name: string }
        const userId = (request as any).userId

        if (!domain_name || typeof domain_name !== 'string') {
          return reply.status(400).send({ error: 'domain_name is required' })
        }

        // Verify project ownership
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, user_id: true },
        })

        if (!project || project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        // Check if domain already exists
        const existing = await prisma.domain.findUnique({
          where: { domain_name },
        })

        if (existing) {
          return reply.status(409).send({ error: 'Domain already in use' })
        }

        // Create domain
        const domain = await prisma.domain.create({
          data: {
            project_id: projectId,
            domain_name,
            ssl_status: 'pending',
          },
        })

        return reply.status(201).send({
          success: true,
          domain: {
            id: domain.id,
            domain_name: domain.domain_name,
            is_verified: domain.is_verified,
            ssl_status: domain.ssl_status,
            dns_cname_target: `proxy.${process.env.ROOT_DOMAIN || 'vercel-clone.local'}`,
          },
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to create domain',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Verify domain ownership (DNS check)
   * POST /api/domains/:domainId/verify
   */
  app.post(
    '/:domainId/verify',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { domainId } = request.params as { domainId: string }
        const userId = (request as any).userId

        const domain = await prisma.domain.findUnique({
          where: { id: domainId },
          include: { project: { select: { user_id: true } } },
        })

        if (!domain || domain.project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        // In Phase 8, we'll implement actual DNS verification
        // For now, mark as verified (development mode)
        const updated = await prisma.domain.update({
          where: { id: domainId },
          data: {
            is_verified: true,
          },
        })

        return reply.send({
          success: true,
          domain: {
            id: updated.id,
            domain_name: updated.domain_name,
            is_verified: updated.is_verified,
            ssl_status: updated.ssl_status,
          },
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to verify domain',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Delete domain
   * DELETE /api/domains/:domainId
   */
  app.delete(
    '/:domainId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { domainId } = request.params as { domainId: string }
        const userId = (request as any).userId

        const domain = await prisma.domain.findUnique({
          where: { id: domainId },
          include: { project: { select: { user_id: true } } },
        })

        if (!domain || domain.project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        await prisma.domain.delete({
          where: { id: domainId },
        })

        return reply.send({
          success: true,
          message: 'Domain deleted',
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to delete domain',
          message: (error as Error).message,
        })
      }
    }
  )
}
