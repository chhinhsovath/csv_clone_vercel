import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'
import { AnalyticsService } from '../services/analytics'
import { ErrorTracker } from '../services/error-tracking'
import { authenticate } from '../middleware/auth'

const analyticsService = new AnalyticsService()
const errorTracker = new ErrorTracker()

export async function analyticsRoutes(app: FastifyInstance) {
  /**
   * Get analytics dashboard for a project
   * GET /api/analytics/dashboard/:projectId
   */
  app.get(
    '/dashboard/:projectId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId } = request.params as { projectId: string }
        const userId = (request as any).userId

        // Verify user owns project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { user_id: true, team_id: true },
        })

        if (!project || (project.user_id !== userId && project.team_id)) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        // Get project overview
        const overview = await analyticsService.getProjectOverview(projectId)

        // Get recent deployments
        const recentDeployments = await prisma.deploymentMetric.findMany({
          where: { project_id: projectId },
          orderBy: { created_at: 'desc' },
          take: 10,
        })

        // Get critical errors
        const criticalErrors = await errorTracker.getCriticalErrors(projectId, 5)

        return reply.send({
          success: true,
          data: {
            overview,
            recent_deployments: recentDeployments,
            critical_errors: criticalErrors,
          },
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to get dashboard data',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Get deployment analytics
   * GET /api/analytics/deployments/:projectId
   */
  app.get(
    '/deployments/:projectId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId } = request.params as { projectId: string }
        const { days = '30' } = request.query as { days: string }
        const userId = (request as any).userId

        // Verify user owns project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { user_id: true },
        })

        if (!project || project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        const startDate = new Date()
        startDate.setDate(startDate.getDate() - parseInt(days))

        const metrics = await analyticsService.getDeploymentMetrics(projectId, {
          startDate,
          endDate: new Date(),
        })

        return reply.send({
          success: true,
          data: {
            ...metrics,
            time_range: { days: parseInt(days) },
          },
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to get deployment analytics',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Get function analytics
   * GET /api/analytics/functions/:projectId
   */
  app.get(
    '/functions/:projectId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId } = request.params as { projectId: string }
        const { days = '30' } = request.query as { days: string }
        const userId = (request as any).userId

        // Verify user owns project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { user_id: true },
        })

        if (!project || project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        const startDate = new Date()
        startDate.setDate(startDate.getDate() - parseInt(days))

        const metrics = await analyticsService.getFunctionMetrics(projectId, {
          startDate,
          endDate: new Date(),
        })

        return reply.send({
          success: true,
          data: {
            ...metrics,
            time_range: { days: parseInt(days) },
          },
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to get function analytics',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Get build analytics
   * GET /api/analytics/builds/:projectId
   */
  app.get(
    '/builds/:projectId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId } = request.params as { projectId: string }
        const { days = '30' } = request.query as { days: string }
        const userId = (request as any).userId

        // Verify user owns project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { user_id: true },
        })

        if (!project || project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        const startDate = new Date()
        startDate.setDate(startDate.getDate() - parseInt(days))

        const metrics = await analyticsService.getBuildMetrics(projectId, {
          startDate,
          endDate: new Date(),
        })

        return reply.send({
          success: true,
          data: {
            ...metrics,
            time_range: { days: parseInt(days) },
          },
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to get build analytics',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Get error analytics
   * GET /api/analytics/errors/:projectId
   */
  app.get(
    '/errors/:projectId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId } = request.params as { projectId: string }
        const { days = '30' } = request.query as { days: string }
        const userId = (request as any).userId

        // Verify user owns project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { user_id: true },
        })

        if (!project || project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        const startDate = new Date()
        startDate.setDate(startDate.getDate() - parseInt(days))

        const [metrics, trends, byType, stats] = await Promise.all([
          analyticsService.getErrorMetrics(projectId, {
            startDate,
            endDate: new Date(),
          }),
          errorTracker.getErrorTrends(projectId, {
            startDate,
            endDate: new Date(),
          }),
          errorTracker.groupErrorsByType(projectId),
          errorTracker.getErrorStats(projectId),
        ])

        return reply.send({
          success: true,
          data: {
            ...metrics,
            trends,
            by_type: byType,
            stats,
            time_range: { days: parseInt(days) },
          },
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to get error analytics',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Create an alert
   * POST /api/analytics/alerts
   */
  app.post(
    '/alerts',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId, name, type, condition, time_window, notification_channels } =
          request.body as any
        const userId = (request as any).userId

        // Verify user owns project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { user_id: true },
        })

        if (!project || project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        const alert = await errorTracker.createAlert(projectId, {
          name,
          type,
          condition,
          time_window,
          notification_channels,
        })

        return reply.status(201).send({
          success: true,
          alert,
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to create alert',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Get alerts for a project
   * GET /api/analytics/alerts/:projectId
   */
  app.get(
    '/alerts/:projectId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId } = request.params as { projectId: string }
        const userId = (request as any).userId

        // Verify user owns project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { user_id: true },
        })

        if (!project || project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        const alerts = await errorTracker.getAlerts(projectId)

        return reply.send({
          success: true,
          alerts,
          count: alerts.length,
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to get alerts',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Update an alert
   * PUT /api/analytics/alerts/:alertId
   */
  app.put(
    '/alerts/:alertId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { alertId } = request.params as { alertId: string }
        const userId = (request as any).userId

        // Get alert and verify ownership
        const alert = await prisma.alert.findUnique({
          where: { id: alertId },
          include: { project: { select: { user_id: true } } },
        })

        if (!alert || alert.project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        const updated = await errorTracker.updateAlert(alertId, request.body as any)

        return reply.send({
          success: true,
          alert: updated,
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to update alert',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Delete an alert
   * DELETE /api/analytics/alerts/:alertId
   */
  app.delete(
    '/alerts/:alertId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { alertId } = request.params as { alertId: string }
        const userId = (request as any).userId

        // Get alert and verify ownership
        const alert = await prisma.alert.findUnique({
          where: { id: alertId },
          include: { project: { select: { user_id: true } } },
        })

        if (!alert || alert.project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        await errorTracker.deleteAlert(alertId)

        return reply.send({
          success: true,
          message: 'Alert deleted',
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to delete alert',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Toggle alert
   * POST /api/analytics/alerts/:alertId/toggle
   */
  app.post(
    '/alerts/:alertId/toggle',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { alertId } = request.params as { alertId: string }
        const userId = (request as any).userId

        // Get alert and verify ownership
        const alert = await prisma.alert.findUnique({
          where: { id: alertId },
          include: { project: { select: { user_id: true } } },
        })

        if (!alert || alert.project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        await errorTracker.toggleAlert(alertId)

        return reply.send({
          success: true,
          message: 'Alert toggled',
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to toggle alert',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Get error details
   * GET /api/analytics/errors/:projectId/details
   */
  app.get(
    '/errors/:projectId/details',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId } = request.params as { projectId: string }
        const { type, severity, resolved, limit = '50', offset = '0' } = request.query as any
        const userId = (request as any).userId

        // Verify user owns project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { user_id: true },
        })

        if (!project || project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        const errors = await errorTracker.getErrors(projectId, {
          type,
          severity,
          resolved: resolved ? resolved === 'true' : undefined,
          limit: parseInt(limit),
          offset: parseInt(offset),
        })

        return reply.send({
          success: true,
          ...errors,
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to get error details',
          message: (error as Error).message,
        })
      }
    }
  )
}
