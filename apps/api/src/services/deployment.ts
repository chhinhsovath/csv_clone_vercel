import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

export interface CreateDeploymentData {
  project_id: string
  git_commit_sha: string
  git_commit_msg?: string
  git_branch: string
  git_author?: string
}

export interface DeploymentQueue {
  deployment_id: string
  project_id: string
  git_commit_sha: string
  git_branch: string
  git_repo_url: string
}

export class DeploymentService {
  /**
   * Create a new deployment record
   */
  async createDeployment(data: CreateDeploymentData) {
    try {
      const deployment = await prisma.deployment.create({
        data: {
          ...data,
          status: 'queued',
        },
      })

      logger.info('Deployment created', {
        deployment_id: deployment.id,
        project_id: data.project_id,
        status: 'queued',
      })

      return deployment
    } catch (error: any) {
      logger.error('Failed to create deployment', {
        error: error.message,
        project_id: data.project_id,
      })
      throw error
    }
  }

  /**
   * Add deployment to build queue
   */
  async queueDeployment(deployment: any): Promise<void> {
    try {
      // Get project details
      const project = await prisma.project.findUnique({
        where: { id: deployment.project_id },
      })

      if (!project) {
        throw new Error('Project not found')
      }

      // Add to Redis queue
      const queueData: DeploymentQueue = {
        deployment_id: deployment.id,
        project_id: deployment.project_id,
        git_commit_sha: deployment.git_commit_sha,
        git_branch: deployment.git_branch,
        git_repo_url: project.git_repo_url,
      }

      await redis.lpush(
        'deployment:queue',
        JSON.stringify(queueData)
      )

      logger.info('Deployment queued for build', {
        deployment_id: deployment.id,
        project_id: deployment.project_id,
      })
    } catch (error: any) {
      logger.error('Failed to queue deployment', {
        error: error.message,
        deployment_id: deployment.id,
      })
      throw error
    }
  }

  /**
   * Update deployment status
   */
  async updateDeploymentStatus(
    deployment_id: string,
    status: string,
    metadata?: Record<string, any>
  ): Promise<any> {
    try {
      const updateData: any = { status, updated_at: new Date() }

      if (status === 'building') {
        updateData.build_start_at = new Date()
      } else if (status === 'success') {
        updateData.build_end_at = new Date()
      }

      if (metadata) {
        updateData.deployment_url = metadata.deployment_url || null
        if (metadata.file_count !== undefined) updateData.file_count = metadata.file_count
        if (metadata.build_size !== undefined) updateData.build_size = metadata.build_size
      }

      const deployment = await prisma.deployment.update({
        where: { id: deployment_id },
        data: updateData,
      })

      logger.info('Deployment status updated', {
        deployment_id,
        status,
      })

      return deployment
    } catch (error: any) {
      logger.error('Failed to update deployment status', {
        error: error.message,
        deployment_id,
      })
      throw error
    }
  }

  /**
   * Get deployment details
   */
  async getDeployment(deployment_id: string): Promise<any> {
    try {
      const deployment = await prisma.deployment.findUnique({
        where: { id: deployment_id },
      })

      return deployment
    } catch (error: any) {
      logger.error('Failed to get deployment', {
        error: error.message,
        deployment_id,
      })
      throw error
    }
  }

  /**
   * List deployments for a project
   */
  async listDeployments(project_id: string, limit: number = 10, offset: number = 0) {
    try {
      const [deployments, total] = await Promise.all([
        prisma.deployment.findMany({
          where: { project_id },
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.deployment.count({
          where: { project_id },
        }),
      ])

      return {
        deployments,
        total,
        limit,
        offset,
      }
    } catch (error: any) {
      logger.error('Failed to list deployments', {
        error: error.message,
        project_id,
      })
      throw error
    }
  }

  /**
   * Create deployment from GitHub webhook
   */
  async createDeploymentFromWebhook(
    projectId: string,
    payload: any
  ): Promise<any> {
    try {
      const deployment = await this.createDeployment({
        project_id: projectId,
        git_commit_sha: payload.after,
        git_commit_msg: payload.head_commit?.message,
        git_branch: payload.ref.replace('refs/heads/', ''),
        git_author: payload.head_commit?.author?.name,
      })

      // Queue it immediately
      await this.queueDeployment(deployment)

      return deployment
    } catch (error: any) {
      logger.error('Failed to create deployment from webhook', {
        error: error.message,
        projectId,
      })
      throw error
    }
  }

  /**
   * Cleanup old deployments (keep last N)
   */
  async cleanupOldDeployments(
    project_id: string,
    keepCount: number = 10
  ): Promise<void> {
    try {
      const deployments = await prisma.deployment.findMany({
        where: { project_id },
        orderBy: { created_at: 'desc' },
        select: { id: true },
      })

      if (deployments.length > keepCount) {
        const toDelete = deployments.slice(keepCount).map(d => d.id)

        await prisma.deployment.deleteMany({
          where: {
            id: { in: toDelete },
          },
        })

        logger.info('Old deployments cleaned up', {
          project_id,
          deleted_count: toDelete.length,
        })
      }
    } catch (error: any) {
      logger.error('Failed to cleanup old deployments', {
        error: error.message,
        project_id,
      })
    }
  }
}

// Create singleton instance
export const deploymentService = new DeploymentService()
