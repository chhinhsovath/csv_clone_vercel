import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'
import { authenticate } from '../middleware/auth'

export async function functionRoutes(app: FastifyInstance) {
  /**
   * Create a function
   * POST /api/functions/projects/:projectId
   */
  app.post(
    '/projects/:projectId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId } = request.params as { projectId: string }
        const { function_name, file_path, runtime } = request.body as {
          function_name: string
          file_path: string
          runtime: string
        }
        const userId = (request as any).userId

        // Verify project ownership
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, user_id: true },
        })

        if (!project || project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        // Check if function already exists
        const existing = await prisma.deployment_function.findUnique({
          where: {
            project_id_function_name: {
              project_id: projectId,
              function_name,
            },
          },
        })

        if (existing) {
          return reply.status(409).send({ error: 'Function already exists' })
        }

        // Create function
        const fn = await prisma.deployment_function.create({
          data: {
            project_id: projectId,
            function_name,
            file_path,
            runtime,
          },
        })

        return reply.status(201).send({
          success: true,
          function: fn,
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to create function',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Get function
   * GET /api/functions/:projectId/:functionName
   */
  app.get(
    '/:projectId/:functionName',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId, functionName } = request.params as {
          projectId: string
          functionName: string
        }

        const fn = await prisma.deployment_function.findUnique({
          where: {
            project_id_function_name: {
              project_id: projectId,
              function_name: functionName,
            },
          },
        })

        if (!fn) {
          return reply.status(404).send({ error: 'Function not found' })
        }

        return reply.send({
          success: true,
          function: fn,
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to get function',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * List functions for a project
   * GET /api/functions/projects/:projectId
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
          select: { id: true, user_id: true },
        })

        if (!project || project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        const functions = await prisma.deployment_function.findMany({
          where: { project_id: projectId },
          orderBy: { created_at: 'desc' },
        })

        return reply.send({
          success: true,
          functions,
          count: functions.length,
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to list functions',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Update function
   * PATCH /api/functions/:projectId/:functionName
   */
  app.patch(
    '/:projectId/:functionName',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId, functionName } = request.params as {
          projectId: string
          functionName: string
        }
        const { is_active } = request.body as { is_active?: boolean }
        const userId = (request as any).userId

        // Verify project ownership
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, user_id: true },
        })

        if (!project || project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        const updated = await prisma.deployment_function.update({
          where: {
            project_id_function_name: {
              project_id: projectId,
              function_name: functionName,
            },
          },
          data: is_active !== undefined ? { is_active } : {},
        })

        return reply.send({
          success: true,
          function: updated,
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to update function',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Delete function
   * DELETE /api/functions/:projectId/:functionName
   */
  app.delete(
    '/:projectId/:functionName',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId, functionName } = request.params as {
          projectId: string
          functionName: string
        }
        const userId = (request as any).userId

        // Verify project ownership
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { id: true, user_id: true },
        })

        if (!project || project.user_id !== userId) {
          return reply.status(403).send({ error: 'Unauthorized' })
        }

        await prisma.deployment_function.delete({
          where: {
            project_id_function_name: {
              project_id: projectId,
              function_name: functionName,
            },
          },
        })

        return reply.send({
          success: true,
          message: 'Function deleted',
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to delete function',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Register function (called by build service)
   * POST /api/functions/register
   */
  app.post(
    '/register',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { project_id, function_name, file_path, runtime } =
          request.body as {
            project_id: string
            function_name: string
            file_path: string
            runtime: string
          }

        // Check if function already exists
        const existing = await prisma.deployment_function.findUnique({
          where: {
            project_id_function_name: {
              project_id,
              function_name,
            },
          },
        })

        if (existing) {
          // Update existing
          const updated = await prisma.deployment_function.update({
            where: {
              project_id_function_name: {
                project_id,
                function_name,
              },
            },
            data: { file_path, runtime },
          })

          return reply.send({
            success: true,
            function: updated,
          })
        }

        // Create new
        const fn = await prisma.deployment_function.create({
          data: {
            project_id,
            function_name,
            file_path,
            runtime,
          },
        })

        return reply.status(201).send({
          success: true,
          function: fn,
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to register function',
          message: (error as Error).message,
        })
      }
    }
  )

  /**
   * Get function code (for functions service)
   * GET /api/functions/code/:projectId/:functionName
   */
  app.get(
    '/code/:projectId/:functionName',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { projectId, functionName } = request.params as {
          projectId: string
          functionName: string
        }

        // In a real implementation, this would fetch from storage
        // For now, return a placeholder
        const fn = await prisma.deployment_function.findUnique({
          where: {
            project_id_function_name: {
              project_id: projectId,
              function_name: functionName,
            },
          },
        })

        if (!fn) {
          return reply.status(404).send({ error: 'Function not found' })
        }

        // TODO: Fetch actual code from storage
        // For now, return metadata that functions service can use
        return reply.send({
          code: `// Function: ${functionName}\nexport async function handler(event) {\n  return { message: 'Hello' };\n}`,
          metadata: fn,
        })
      } catch (error) {
        return reply.status(500).send({
          error: 'Failed to get function code',
          message: (error as Error).message,
        })
      }
    }
  )
}
