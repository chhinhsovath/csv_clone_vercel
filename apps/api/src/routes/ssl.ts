import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'
import { CertificateService } from '../services/certificate'
import { authenticate } from '../middleware/auth'

const certificateService = new CertificateService()

export async function sslRoutes(app: FastifyInstance) {
  /**
   * Request SSL certificate for domain
   * POST /api/ssl/domains/:domainId/request
   */
  app.post(
    '/domains/:domainId/request',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { domainId } = request.params as { domainId: string }
        const userId = (request as any).userId

        // Get domain and verify ownership
        const domain = await prisma.domain.findUnique({
          where: { id: domainId },
          include: {
            project: {
              select: { user_id: true },
            },
          },
        })

        if (!domain || domain.project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        // Check if domain is verified
        if (!domain.is_verified) {
          return reply.status(400).send({
            error: 'Domain must be verified before requesting certificate',
          })
        }

        // Get user email
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        })

        if (!user) {
          return reply.status(404).send({ error: 'User not found' })
        }

        // Request certificate
        const success = await certificateService.requestCertificate(
          domainId,
          domain.domain_name,
          user.email
        )

        if (success) {
          return reply.send({
            success: true,
            message: 'Certificate request submitted',
            domain: domain.domain_name,
            status: 'pending',
          })
        } else {
          return reply.status(500).send({
            error: 'Failed to request certificate',
            message: 'Please try again later',
          })
        }
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to request certificate',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Check SSL certificate status
   * GET /api/ssl/domains/:domainId/status
   */
  app.get(
    '/domains/:domainId/status',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { domainId } = request.params as { domainId: string }
        const userId = (request as any).userId

        // Get domain and verify ownership
        const domain = await prisma.domain.findUnique({
          where: { id: domainId },
          include: {
            project: {
              select: { user_id: true },
            },
          },
        })

        if (!domain || domain.project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        // Get certificate info
        const certInfo = await certificateService.getDomainCertificateInfo(
          domainId
        )

        if (!certInfo) {
          return reply.status(404).send({ error: 'Domain not found' })
        }

        return reply.send({
          success: true,
          certificate: certInfo,
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to get certificate status',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Renew SSL certificate
   * POST /api/ssl/domains/:domainId/renew
   */
  app.post(
    '/domains/:domainId/renew',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { domainId } = request.params as { domainId: string }
        const userId = (request as any).userId

        // Get domain and verify ownership
        const domain = await prisma.domain.findUnique({
          where: { id: domainId },
          include: {
            project: {
              select: { user_id: true },
            },
          },
        })

        if (!domain || domain.project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        // Renew certificate
        const success = await certificateService.renewCertificate(
          domainId,
          domain.domain_name
        )

        if (success) {
          return reply.send({
            success: true,
            message: 'Certificate renewal submitted',
            domain: domain.domain_name,
          })
        } else {
          return reply.status(500).send({
            error: 'Failed to renew certificate',
            message: 'Please try again later',
          })
        }
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to renew certificate',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Get all certificates for user (across all domains)
   * GET /api/ssl/certificates
   */
  app.get(
    '/certificates',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).userId

        // Get all domains for user's projects
        const domains = await prisma.domain.findMany({
          where: {
            project: {
              user_id: userId,
            },
          },
          select: {
            id: true,
            domain_name: true,
            is_verified: true,
            ssl_status: true,
            ssl_expires_at: true,
            project: {
              select: { id: true, name: true },
            },
          },
          orderBy: { created_at: 'desc' },
        })

        // Add days until expiry
        const enrichedDomains = domains.map((d) => {
          let daysUntilExpiry = null
          if (d.ssl_expires_at) {
            const now = Date.now()
            const expiryTime = d.ssl_expires_at.getTime()
            daysUntilExpiry = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24))
          }

          return {
            ...d,
            daysUntilExpiry,
          }
        })

        return reply.send({
          success: true,
          certificates: enrichedDomains,
          count: enrichedDomains.length,
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to list certificates',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Admin: Check and renew certificates (for scheduled jobs)
   * POST /api/ssl/admin/check-renewals
   */
  app.post(
    '/admin/check-renewals',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // In production, verify this is called from a scheduled job/internal service
        const internalKey = request.headers['x-internal-key']
        if (internalKey !== process.env.INTERNAL_API_KEY) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        await certificateService.checkCertificatesForRenewal()

        return reply.send({
          success: true,
          message: 'Certificate renewal check completed',
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to check certificate renewals',
          message: (error as Error).message,
        })
      }
    }
  )
}
