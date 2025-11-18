import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'

export async function environmentRoutes(app: FastifyInstance) {
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ message: 'Environment variables endpoint' })
  })
}
