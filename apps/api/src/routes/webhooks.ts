import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@/lib/prisma'
import { deploymentService } from '@/services/deployment'
import { githubService } from '@/services/github'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export async function webhookRoutes(app: FastifyInstance) {
  // GitHub webhook handler
  app.post<{ Body: any }>(
    '/github',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const signature = request.headers['x-hub-signature-256'] as string
        const event = request.headers['x-github-event'] as string

        if (!signature || !event) {
          throw new AppError('Missing webhook headers', 400, 'INVALID_WEBHOOK')
        }

        // Get raw body for signature verification
        const rawBody = JSON.stringify(request.body)

        // Find webhook by secret
        const webhook = await prisma.webhook.findFirst({
          where: {
            is_active: true,
          },
        })

        if (!webhook) {
          logger.warn('Webhook received but no webhook found')
          return reply.status(404).send({ message: 'Webhook not found' })
        }

        // Verify signature
        try {
          const isValid = githubService.verifyWebhookSignature(
            rawBody,
            signature,
            webhook.secret
          )

          if (!isValid) {
            logger.warn('Invalid webhook signature')
            throw new AppError('Invalid webhook signature', 401, 'INVALID_SIGNATURE')
          }
        } catch (error: any) {
          logger.warn('Webhook signature verification failed', {
            error: error.message,
          })
          throw new AppError('Invalid webhook signature', 401, 'INVALID_SIGNATURE')
        }

        // Handle different event types
        if (event === 'push') {
          return handlePushEvent(request.body, webhook, reply)
        } else if (event === 'pull_request') {
          return handlePullRequestEvent(request.body, webhook, reply)
        } else {
          return reply.send({ message: 'Event type not handled', event })
        }
      } catch (error: any) {
        logger.error('Webhook processing error', {
          error: error.message,
        })
        throw error
      }
    }
  )

  // Create webhook for a project
  app.post<{
    Params: { projectId: string }
    Body: { webhookUrl?: string }
  }>(
    '/projects/:projectId/github',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId } = request.params as { projectId: string }

        // Get project
        const project = await prisma.project.findUnique({
          where: { id: projectId },
        })

        if (!project) {
          throw new AppError('Project not found', 404, 'NOT_FOUND')
        }

        // Get user's GitHub token
        const gitToken = await prisma.gitToken.findUnique({
          where: { user_id: project.user_id || '' },
        })

        if (!gitToken) {
          throw new AppError('GitHub not connected', 400, 'GITHUB_NOT_CONNECTED')
        }

        // Extract owner and repo from git_repo_url
        const match = project.git_repo_url.match(/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/)
        if (!match) {
          throw new AppError('Invalid GitHub URL', 400, 'INVALID_GITHUB_URL')
        }

        const [, owner, repo] = match
        const webhookUrl =
          request.body.webhookUrl ||
          `${process.env.API_URL || 'http://localhost:9000'}/api/webhooks/github`
        const secret = require('crypto').randomBytes(16).toString('hex')

        // Create webhook on GitHub
        const githubWebhook = await githubService.createWebhook(
          gitToken.access_token,
          owner,
          repo,
          webhookUrl,
          secret
        )

        // Save webhook in database
        const webhook = await prisma.webhook.create({
          data: {
            project_id: projectId,
            provider: 'github',
            event_type: 'push',
            secret,
          },
        })

        logger.info('GitHub webhook created', {
          projectId,
          githubHookId: githubWebhook.id,
        })

        return reply.status(201).send({
          message: 'Webhook created successfully',
          webhook: {
            id: webhook.id,
            url: githubWebhook.url,
            events: ['push', 'pull_request'],
          },
        })
      } catch (error: any) {
        logger.error('Failed to create GitHub webhook', {
          error: error.message,
        })
        throw error
      }
    }
  )

  // Delete webhook
  app.delete<{ Params: { webhookId: string } }>(
    '/:webhookId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { webhookId } = request.params as { webhookId: string }

        const webhook = await prisma.webhook.findUnique({
          where: { id: webhookId },
          include: { project: true },
        })

        if (!webhook) {
          throw new AppError('Webhook not found', 404, 'NOT_FOUND')
        }

        // Delete from database
        await prisma.webhook.delete({
          where: { id: webhookId },
        })

        logger.info('Webhook deleted', { webhookId })

        return reply.send({
          message: 'Webhook deleted successfully',
        })
      } catch (error: any) {
        logger.error('Failed to delete webhook', {
          error: error.message,
        })
        throw error
      }
    }
  )
}

/**
 * Handle GitHub push event
 */
async function handlePushEvent(payload: any, webhook: any, reply: FastifyReply) {
  try {
    logger.info('GitHub push event received', {
      repository: payload.repository?.full_name,
      branch: payload.ref,
      commits: payload.commits?.length,
    })

    // Get project by repository URL
    const project = await prisma.project.findUnique({
      where: { id: webhook.project_id },
    })

    if (!project) {
      return reply.status(404).send({ message: 'Project not found' })
    }

    // Check if push is to the tracked branch
    const branchName = payload.ref.replace('refs/heads/', '')
    if (branchName !== project.git_branch) {
      logger.info('Push to non-tracked branch, skipping', {
        pushed_branch: branchName,
        tracked_branch: project.git_branch,
      })
      return reply.send({ message: 'Push to non-tracked branch' })
    }

    // Create deployment
    const deployment = await deploymentService.createDeploymentFromWebhook(
      project.id,
      payload
    )

    // Update webhook last_triggered
    await prisma.webhook.update({
      where: { id: webhook.id },
      data: { last_triggered: new Date() },
    })

    logger.info('Deployment created from push event', {
      deployment_id: deployment.id,
      project_id: project.id,
    })

    return reply.status(201).send({
      message: 'Deployment queued',
      deployment_id: deployment.id,
    })
  } catch (error: any) {
    logger.error('Failed to handle push event', {
      error: error.message,
    })
    throw error
  }
}

/**
 * Handle GitHub pull request event
 */
async function handlePullRequestEvent(
  payload: any,
  webhook: any,
  reply: FastifyReply
) {
  try {
    logger.info('GitHub pull request event received', {
      repository: payload.repository?.full_name,
      action: payload.action,
      pr_number: payload.pull_request?.number,
    })

    // For now, we'll just acknowledge the event
    // Full PR preview deployments can be added later
    return reply.send({
      message: 'Pull request event received',
      action: payload.action,
    })
  } catch (error: any) {
    logger.error('Failed to handle pull request event', {
      error: error.message,
    })
    throw error
  }
}
