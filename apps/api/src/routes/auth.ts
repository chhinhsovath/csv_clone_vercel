import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AppError, ValidationError, ConflictError, AuthenticationError } from '@/lib/errors'
import { hashPassword, verifyPassword } from '@/lib/password'
import { logger } from '@/lib/logger'
import { githubService } from '@/services/github'
import crypto from 'crypto'

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).optional(),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function authRoutes(app: FastifyInstance) {
  // Register
  app.post<{ Body: z.infer<typeof RegisterSchema> }>(
    '/register',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = RegisterSchema.parse(request.body)

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
          where: { email: data.email },
        })

        if (existingUser) {
          throw new ConflictError('Email already in use')
        }

        // Create user
        const passwordHash = await hashPassword(data.password)
        const user = await prisma.user.create({
          data: {
            email: data.email,
            name: data.name,
            password_hash: passwordHash,
          },
        })

        // Generate token
        const token = app.jwt.sign({
          id: user.id,
          email: user.email,
        })

        logger.info('User registered successfully', { userId: user.id, email: user.email })

        return reply.status(201).send({
          message: 'User registered successfully',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
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

  // Login
  app.post<{ Body: z.infer<typeof LoginSchema> }>(
    '/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = LoginSchema.parse(request.body)

        // Find user
        const user = await prisma.user.findUnique({
          where: { email: data.email },
        })

        if (!user) {
          throw new AuthenticationError('Invalid email or password')
        }

        // Verify password
        const isPasswordValid = await verifyPassword(data.password, user.password_hash)

        if (!isPasswordValid) {
          throw new AuthenticationError('Invalid email or password')
        }

        // Generate token
        const token = app.jwt.sign({
          id: user.id,
          email: user.email,
        })

        logger.info('User logged in successfully', { userId: user.id, email: user.email })

        return reply.send({
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
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

  // Get current user
  app.get(
    '/me',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as any

      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          email: true,
          name: true,
          created_at: true,
        },
      })

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND')
      }

      return reply.send({
        user,
      })
    }
  )

  // Refresh token
  app.post(
    '/refresh',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const payload = request.user as any

      const token = app.jwt.sign({
        id: payload.id,
        email: payload.email,
      })

      return reply.send({
        message: 'Token refreshed',
        token,
      })
    }
  )

  // GitHub OAuth - Get authorization URL
  app.get(
    '/github/authorize',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const state = crypto.randomBytes(16).toString('hex')
        const url = githubService.getAuthorizationUrl(state)

        // Store state in session/cache for verification
        // In production, use Redis or session store
        return reply.send({
          url,
          state,
        })
      } catch (error) {
        logger.error('Failed to generate GitHub auth URL', { error })
        throw new AppError('Failed to generate authorization URL', 500)
      }
    }
  )

  // GitHub OAuth - Handle callback
  app.get<{ Querystring: { code?: string; state?: string } }>(
    '/github/callback',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { code, state } = request.query

        if (!code) {
          throw new AuthenticationError('GitHub authorization code not provided')
        }

        // Exchange code for access token
        const accessToken = await githubService.exchangeCodeForToken(code)

        // Get GitHub user info
        const githubUser = await githubService.getUser(accessToken)

        // Check if user exists by GitHub ID
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: githubUser.email || '' },
            ],
          },
        })

        // Create user if doesn't exist
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: githubUser.email || `${githubUser.login}@github.local`,
              name: githubUser.name,
              password_hash: await hashPassword(crypto.randomBytes(16).toString('hex')),
            },
          })

          logger.info('User created via GitHub OAuth', {
            userId: user.id,
            githubUsername: githubUser.login,
          })
        }

        // Save GitHub token
        await githubService.saveGitToken(user.id, accessToken, githubUser)

        // Generate JWT token
        const jwtToken = app.jwt.sign({
          id: user.id,
          email: user.email,
        })

        logger.info('User logged in via GitHub', {
          userId: user.id,
          githubUsername: githubUser.login,
        })

        // In a real app, redirect to frontend with token
        // For now, return JSON response
        return reply.send({
          message: 'GitHub authentication successful',
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token: jwtToken,
          githubUser: {
            login: githubUser.login,
            avatar_url: githubUser.avatar_url,
          },
        })
      } catch (error: any) {
        logger.error('GitHub OAuth callback failed', {
          error: error.message,
        })
        throw error
      }
    }
  )

  // Get GitHub authorization info for current user
  app.get(
    '/github/info',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const payload = request.user as any
        const gitToken = await prisma.gitToken.findUnique({
          where: { user_id: payload.id },
          select: {
            provider: true,
            provider_username: true,
            created_at: true,
          },
        })

        return reply.send({
          connected: !!gitToken,
          provider: gitToken?.provider || null,
          username: gitToken?.provider_username || null,
          connected_at: gitToken?.created_at || null,
        })
      } catch (error) {
        logger.error('Failed to get GitHub info', { error })
        throw new AppError('Failed to get GitHub info', 500)
      }
    }
  )

  // Disconnect GitHub account
  app.post(
    '/github/disconnect',
    { onRequest: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const payload = request.user as any
        await githubService.deleteGitToken(payload.id)

        return reply.send({
          message: 'GitHub account disconnected',
        })
      } catch (error) {
        logger.error('Failed to disconnect GitHub', { error })
        throw new AppError('Failed to disconnect GitHub account', 500)
      }
    }
  )
}
