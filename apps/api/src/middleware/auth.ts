import { FastifyRequest, FastifyReply } from 'fastify'
import { AuthenticationError } from '@/lib/errors'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch (err) {
    throw new AuthenticationError('Invalid or missing authentication token')
  }
}

export function getRequestUserId(request: FastifyRequest): string {
  const payload = request.user as any
  if (!payload?.id) {
    throw new AuthenticationError('User information not found in token')
  }
  return payload.id
}

export function getRequestUserEmail(request: FastifyRequest): string {
  const payload = request.user as any
  if (!payload?.email) {
    throw new AuthenticationError('Email not found in token')
  }
  return payload.email
}
