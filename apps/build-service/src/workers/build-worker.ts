import Redis from 'ioredis'
import { PrismaClient } from '@prisma/client'
import * as path from 'path'
import * as fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from '@/lib/logger'
import { GitService } from '@/services/git'
import { BuildService } from '@/services/build'
import { StorageService } from '@/services/storage'

const execAsync = promisify(exec)

interface DeploymentJob {
  deployment_id: string
  project_id: string
  git_commit_sha: string
  git_branch: string
  git_repo_url: string
}

export class BuildWorker {
  private redis: Redis.Redis
  private prisma: PrismaClient
  private gitService: GitService
  private buildService: BuildService
  private storageService: StorageService
  private isProcessing = false
  private buildDir: string

  constructor(redis: Redis.Redis, prisma: PrismaClient) {
    this.redis = redis
    this.prisma = prisma
    this.gitService = new GitService()
    this.buildService = new BuildService()
    this.storageService = new StorageService()
    this.buildDir = process.env.BUILD_DIR || '/tmp/builds'

    // Create build directory if it doesn't exist
    if (!fs.existsSync(this.buildDir)) {
      fs.mkdirSync(this.buildDir, { recursive: true })
    }
  }

  async processNextJob(): Promise<boolean> {
    if (this.isProcessing) {
      return false
    }

    try {
      // Pop job from queue
      const jobJson = await this.redis.rpop('deployment:queue')

      if (!jobJson) {
        return false
      }

      this.isProcessing = true
      const job: DeploymentJob = JSON.parse(jobJson)

      logger.info('Processing deployment job', {
        deployment_id: job.deployment_id,
        project_id: job.project_id,
      })

      await this.executeJob(job)

      return true
    } catch (error: any) {
      logger.error('Failed to process job', { error: error.message })
      return true
    } finally {
      this.isProcessing = false
    }
  }

  private async executeJob(job: DeploymentJob) {
    const deploymentId = job.deployment_id
    const projectDir = path.join(this.buildDir, job.project_id)
    let buildDir: string | null = null

    try {
      // Step 1: Update status to building
      await this.updateDeploymentStatus(deploymentId, 'building')
      logger.info('Step 1: Cloning repository', { deployment_id: deploymentId })

      // Step 2: Clone repository
      const cloneDir = await this.gitService.cloneRepository(
        job.git_repo_url,
        job.git_branch,
        projectDir
      )

      logger.info('Step 2: Repository cloned', {
        deployment_id: deploymentId,
        path: cloneDir,
      })

      // Step 3: Detect framework and get build config
      logger.info('Step 3: Detecting framework', { deployment_id: deploymentId })

      const projectData = await this.prisma.project.findUnique({
        where: { id: job.project_id },
      })

      if (!projectData) {
        throw new Error('Project not found')
      }

      const buildCommand = projectData.build_command
      const outputDirectory = projectData.output_directory

      logger.info('Build configuration', {
        deployment_id: deploymentId,
        buildCommand,
        outputDirectory,
      })

      // Step 4: Install dependencies
      logger.info('Step 4: Installing dependencies', { deployment_id: deploymentId })

      await this.buildService.installDependencies(cloneDir)

      logger.info('Dependencies installed', { deployment_id: deploymentId })

      // Step 5: Execute build command
      logger.info('Step 5: Executing build', { deployment_id: deploymentId })

      await this.buildService.executeBuild(cloneDir, buildCommand)

      logger.info('Build completed', { deployment_id: deploymentId })

      // Step 6: Prepare build artifacts
      buildDir = path.join(cloneDir, outputDirectory)

      if (!fs.existsSync(buildDir)) {
        throw new Error(`Output directory not found: ${outputDirectory}`)
      }

      logger.info('Step 6: Preparing artifacts', {
        deployment_id: deploymentId,
        buildDir,
      })

      // Step 7: Upload to storage
      logger.info('Step 7: Uploading to storage', { deployment_id: deploymentId })

      const uploadResult = await this.storageService.uploadDeployment(
        job.project_id,
        deploymentId,
        buildDir
      )

      logger.info('Upload completed', {
        deployment_id: deploymentId,
        fileCount: uploadResult.fileCount,
        totalSize: uploadResult.totalSize,
      })

      // Step 8: Update deployment as successful
      const deploymentUrl = `${job.project_id}.${process.env.ROOT_DOMAIN || 'vercel-clone.local'}`

      await this.updateDeploymentStatus(deploymentId, 'success', {
        deployment_url: deploymentUrl,
        file_count: uploadResult.fileCount,
        build_size: uploadResult.totalSize,
      })

      logger.info('Deployment successful', {
        deployment_id: deploymentId,
        url: deploymentUrl,
      })
    } catch (error: any) {
      logger.error('Deployment failed', {
        deployment_id: deploymentId,
        error: error.message,
        stack: error.stack,
      })

      await this.updateDeploymentStatus(deploymentId, 'failed')

      // Add error log
      await this.prisma.buildLog.create({
        data: {
          deployment_id: deploymentId,
          project_id: job.project_id,
          log_type: 'error',
          message: error.message,
        },
      })
    } finally {
      // Cleanup
      try {
        if (buildDir && fs.existsSync(buildDir)) {
          const projectDir = path.dirname(buildDir)
          if (fs.existsSync(projectDir)) {
            fs.rmSync(projectDir, { recursive: true })
            logger.info('Cleaned up build directory', {
              deployment_id: deploymentId,
            })
          }
        }
      } catch (cleanupError) {
        logger.warn('Failed to cleanup build directory', {
          deployment_id: deploymentId,
          error: cleanupError,
        })
      }
    }
  }

  private async updateDeploymentStatus(
    deploymentId: string,
    status: string,
    metadata?: Record<string, any>
  ) {
    try {
      const deployment = await this.prisma.deployment.findUnique({
        where: { id: deploymentId },
      })

      if (!deployment) {
        logger.warn('Deployment not found', { deployment_id: deploymentId })
        return
      }

      const updateData: any = {
        status,
        updated_at: new Date(),
      }

      if (status === 'building') {
        updateData.build_start_at = new Date()
      } else if (status === 'success' || status === 'failed') {
        updateData.build_end_at = new Date()
      }

      if (metadata) {
        updateData.deployment_url = metadata.deployment_url || null
        if (metadata.file_count) updateData.file_count = metadata.file_count
        if (metadata.build_size) updateData.build_size = metadata.build_size
      }

      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: updateData,
      })

      logger.info('Deployment status updated', {
        deployment_id: deploymentId,
        status,
      })
    } catch (error: any) {
      logger.error('Failed to update deployment status', {
        deployment_id: deploymentId,
        error: error.message,
      })
    }
  }

  async shutdown() {
    logger.info('Shutting down build worker')
    // Wait for current job to finish
    let waitCount = 0
    while (this.isProcessing && waitCount < 300) {
      await new Promise(resolve => setTimeout(resolve, 100))
      waitCount++
    }
    if (this.isProcessing) {
      logger.warn('Build worker shutdown timeout')
    }
  }
}
