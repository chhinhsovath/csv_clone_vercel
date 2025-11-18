import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import { prisma } from '../lib/prisma'
import { FunctionExecutor } from './services/function-executor'
import { FunctionRegistry } from './services/function-registry'
import { FunctionRouter } from './services/function-router'
import { logger } from './lib/logger'

require('dotenv').config()

const app = Fastify({
  logger: false,
  trustProxy: true,
})

// Security headers
app.register(helmet, {
  contentSecurityPolicy: false,
})

// Services
const functionExecutor = new FunctionExecutor()
const functionRegistry = new FunctionRegistry()
const functionRouter = new FunctionRouter()

// Metrics
let totalInvocations = 0
let successfulInvocations = 0
let failedInvocations = 0

/**
 * Health check endpoint
 */
app.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    uptime: process.uptime(),
    totalInvocations,
    successfulInvocations,
    failedInvocations,
  }
})

/**
 * Invoke a function
 * POST /api/v1/functions/:projectId/:functionName
 */
app.post<{
  Params: { projectId: string; functionName: string }
}>('/api/v1/functions/:projectId/:functionName', async (request, reply) => {
  totalInvocations++

  try {
    const { projectId, functionName } = request.params
    const { body } = request

    logger.info(
      `Function invocation: ${projectId}/${functionName}`,
      { method: request.method }
    )

    // Validate project and function exist
    const fn = await prisma.deployment_function.findUnique({
      where: {
        project_id_function_name: {
          project_id: projectId,
          function_name: functionName,
        },
      },
      include: {
        project: {
          select: { id: true },
        },
      },
    })

    if (!fn) {
      logger.warn(`Function not found: ${projectId}/${functionName}`)
      return reply.status(404).send({
        error: 'Function not found',
      })
    }

    if (!fn.is_active) {
      logger.warn(`Function disabled: ${projectId}/${functionName}`)
      return reply.status(403).send({
        error: 'Function is disabled',
      })
    }

    // Get function code
    const code = await functionRegistry.getFunction(projectId, functionName)

    if (!code) {
      logger.error(`Function code not found: ${projectId}/${functionName}`)
      return reply.status(404).send({
        error: 'Function code not found',
      })
    }

    // Execute function
    const result = await functionExecutor.execute({
      functionId: fn.id,
      functionName,
      projectId,
      code,
      event: body || {},
      context: {
        functionName,
        projectId,
        invocationId: request.id,
        timestamp: new Date().toISOString(),
      },
    })

    // Update invocation count
    await prisma.deployment_function.update({
      where: { id: fn.id },
      data: {
        invocation_count: { increment: 1 },
      },
    })

    if (result.success) {
      successfulInvocations++

      logger.info(
        `Function succeeded: ${projectId}/${functionName}`,
        { duration: result.duration }
      )

      return reply.status(200).send({
        success: true,
        result: result.output,
        duration: result.duration,
        logs: result.logs,
      })
    } else {
      failedInvocations++

      logger.error(
        `Function failed: ${projectId}/${functionName}`,
        { error: result.error }
      )

      return reply.status(500).send({
        error: 'Function execution failed',
        message: result.error,
        logs: result.logs,
      })
    }
  } catch (error) {
    failedInvocations++
    logger.error(`Function invocation error: ${(error as Error).message}`)
    return reply.status(500).send({
      error: 'Internal server error',
      message: (error as Error).message,
    })
  }
})

/**
 * Get function metadata
 * GET /api/v1/functions/:projectId/:functionName
 */
app.get<{
  Params: { projectId: string; functionName: string }
}>('/api/v1/functions/:projectId/:functionName', async (request, reply) => {
  try {
    const { projectId, functionName } = request.params

    const fn = await prisma.deployment_function.findUnique({
      where: {
        project_id_function_name: {
          project_id: projectId,
          function_name: functionName,
        },
      },
      select: {
        id: true,
        function_name: true,
        file_path: true,
        runtime: true,
        is_active: true,
        invocation_count: true,
        created_at: true,
        updated_at: true,
      },
    })

    if (!fn) {
      return reply.status(404).send({
        error: 'Function not found',
      })
    }

    return reply.send({
      success: true,
      function: fn,
    })
  } catch (error) {
    return reply.status(500).send({
      error: 'Failed to get function metadata',
      message: (error as Error).message,
    })
  }
})

/**
 * List all functions for a project
 * GET /api/v1/projects/:projectId/functions
 */
app.get<{
  Params: { projectId: string }
}>('/api/v1/projects/:projectId/functions', async (request, reply) => {
  try {
    const { projectId } = request.params

    const functions = await prisma.deployment_function.findMany({
      where: { project_id: projectId },
      select: {
        id: true,
        function_name: true,
        file_path: true,
        runtime: true,
        is_active: true,
        invocation_count: true,
        created_at: true,
      },
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
})

/**
 * Disable/enable function
 * PATCH /api/v1/functions/:projectId/:functionName
 */
app.patch<{
  Params: { projectId: string; functionName: string }
>>(
  '/api/v1/functions/:projectId/:functionName',
  async (request, reply) => {
    try {
      const { projectId, functionName } = request.params
      const { is_active } = request.body as { is_active?: boolean }

      if (is_active === undefined) {
        return reply.status(400).send({
          error: 'is_active parameter is required',
        })
      }

      const updated = await prisma.deployment_function.update({
        where: {
          project_id_function_name: {
            project_id: projectId,
            function_name: functionName,
          },
        },
        data: { is_active },
      })

      logger.info(
        `Function ${is_active ? 'enabled' : 'disabled'}: ${projectId}/${functionName}`
      )

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
 * Start the service
 */
const start = async () => {
  try {
    await functionExecutor.initialize()
    logger.info('Function executor initialized')

    await functionRegistry.initialize()
    logger.info('Function registry initialized')

    await functionRouter.initialize()
    logger.info('Function router initialized')

    const port = parseInt(process.env.FUNCTIONS_PORT || '9001')

    await app.listen({ port, host: '0.0.0.0' })
    logger.info(`Functions service listening on port ${port}`)

    logger.info('Serverless functions service started successfully')
  } catch (error) {
    logger.error(`Failed to start service: ${(error as Error).message}`)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
})

start()

export default app
