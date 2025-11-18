import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { deploymentService } from '@/services/deployment'
import { githubService } from '@/services/github'
import { NotFoundError, ValidationError, AuthorizationError } from '@/lib/errors'
import { getRequestUserId } from '@/middleware/auth'
import { logger } from '@/lib/logger'

const CreateDeploymentSchema = z.object({
  git_branch: z.string().optional(),
})

export async function deploymentRoutes(app: FastifyInstance) {
  // Get deployments for a project
  app.get<{ Params: { projectId: string } }>(
    '/projects/:projectId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getRequestUserId(request)
        const { projectId } = request.params as { projectId: string }

        // Check project access
        const project = await prisma.project.findUnique({
          where: { id: projectId },
        })

        if (!project) {
          throw new NotFoundError('Project')
        }

        if (project.user_id !== userId) {
          throw new AuthorizationError()
        }

        const { deployments, total } = await deploymentService.listDeployments(projectId)

        return reply.send({
          deployments,
          total,
        })
      } catch (error) {
        throw error
      }
    }
  )

  // Get single deployment
  app.get<{ Params: { id: string } }>(
    '/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string }

        const deployment = await deploymentService.getDeployment(id)

        if (!deployment) {
          throw new NotFoundError('Deployment')
        }

        return reply.send({ deployment })
      } catch (error) {
        throw error
      }
    }
  )

  // Create deployment (manual trigger)
  app.post<{
    Params: { projectId: string }
    Body: z.infer<typeof CreateDeploymentSchema>
  }>(
    '/projects/:projectId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getRequestUserId(request)
        const { projectId } = request.params as { projectId: string }
        const data = CreateDeploymentSchema.parse(request.body)

        // Check project access
        const project = await prisma.project.findUnique({
          where: { id: projectId },
        })

        if (!project) {
          throw new NotFoundError('Project')
        }

        if (project.user_id !== userId) {
          throw new AuthorizationError()
        }

        // Create deployment
        const deployment = await deploymentService.createDeployment({
          project_id: projectId,
          git_commit_sha: 'HEAD',
          git_branch: data.git_branch || project.git_branch,
          git_commit_msg: 'Manual deployment',
        })

        // Queue it
        await deploymentService.queueDeployment(deployment)

        return reply.status(201).send({
          message: 'Deployment queued',
          deployment,
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError('Invalid input', {
            errors: error.flatten().fieldErrors,
          })
        }
        throw error
      }
    }
  )
}
