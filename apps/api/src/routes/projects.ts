import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { NotFoundError, ValidationError, AuthorizationError } from '@/lib/errors'
import { getRequestUserId } from '@/middleware/auth'

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  git_repo_url: z.string().url(),
  git_branch: z.string().default('main'),
  build_command: z.string().default('npm run build'),
  output_directory: z.string().default('dist'),
})

export async function projectRoutes(app: FastifyInstance) {
  // List projects for current user
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getRequestUserId(request)

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { user_id: userId },
          { team: { members: { some: { user_id: userId } } } },
        ],
      },
      include: {
        _count: {
          select: { deployments: true },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    return reply.send({
      projects: projects.map((p) => ({
        ...p,
        deploymentCount: p._count.deployments,
        _count: undefined,
      })),
    })
  })

  // Create project
  app.post<{ Body: z.infer<typeof CreateProjectSchema> }>(
    '/',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getRequestUserId(request)
        const data = CreateProjectSchema.parse(request.body)

        const project = await prisma.project.create({
          data: {
            user_id: userId,
            ...data,
          },
        })

        return reply.status(201).send({
          message: 'Project created successfully',
          project,
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

  // Get project by ID
  app.get<{ Params: { id: string } }>(
    '/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getRequestUserId(request)
      const { id } = request.params as { id: string }

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              deployments: true,
              domains: true,
            },
          },
        },
      })

      if (!project) {
        throw new NotFoundError('Project')
      }

      // Check authorization
      if (project.user_id !== userId && !project.team_id) {
        throw new AuthorizationError()
      }

      return reply.send({ project })
    }
  )

  // Update project
  app.patch<{
    Params: { id: string }
    Body: Partial<z.infer<typeof CreateProjectSchema>>
  }>(
    '/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = getRequestUserId(request)
        const { id } = request.params as { id: string }

        const project = await prisma.project.findUnique({ where: { id } })

        if (!project) {
          throw new NotFoundError('Project')
        }

        if (project.user_id !== userId) {
          throw new AuthorizationError()
        }

        const updateData = CreateProjectSchema.partial().parse(request.body)

        const updated = await prisma.project.update({
          where: { id },
          data: updateData,
        })

        return reply.send({
          message: 'Project updated successfully',
          project: updated,
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

  // Delete project
  app.delete<{ Params: { id: string } }>(
    '/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getRequestUserId(request)
      const { id } = request.params as { id: string }

      const project = await prisma.project.findUnique({ where: { id } })

      if (!project) {
        throw new NotFoundError('Project')
      }

      if (project.user_id !== userId) {
        throw new AuthorizationError()
      }

      await prisma.project.delete({ where: { id } })

      return reply.send({
        message: 'Project deleted successfully',
      })
    }
  )
}
