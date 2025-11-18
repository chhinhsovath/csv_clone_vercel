import { FastifyError, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'

export async function errorHandler(
  this: FastifyInstance,
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Handle AppError instances
  if (error instanceof AppError) {
    logger.warn(`API Error: ${error.code}`, {
      statusCode: error.statusCode,
      message: error.message,
      path: request.url,
      method: request.method,
    })

    return reply.status(error.statusCode).send({
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        ...(error.meta && { meta: error.meta }),
      },
    })
  }

  // Handle Fastify validation errors
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    logger.warn(`Validation Error: ${error.message}`, {
      statusCode: error.statusCode,
      path: request.url,
      method: request.method,
    })

    return reply.status(error.statusCode).send({
      error: {
        message: error.message,
        code: 'VALIDATION_ERROR',
        statusCode: error.statusCode,
      },
    })
  }

  // Handle unexpected errors
  logger.error('Unhandled Error', {
    error: error.message,
    stack: error.stack,
    path: request.url,
    method: request.method,
  })

  return reply.status(500).send({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
      }),
    },
  })
}
