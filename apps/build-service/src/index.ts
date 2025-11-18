import Redis from 'ioredis'
import * as path from 'path'
import * as fs from 'fs'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'

// Load environment variables
config()

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
const prisma = new PrismaClient()

// Import build service components
import { BuildWorker } from '@/workers/build-worker'
import { logger } from '@/lib/logger'

class BuildServiceManager {
  private workers: BuildWorker[] = []
  private maxConcurrentBuilds = parseInt(process.env.MAX_CONCURRENT_BUILDS || '2')
  private isRunning = false

  async start() {
    logger.info('Starting Build Service', {
      concurrentBuilds: this.maxConcurrentBuilds,
    })

    this.isRunning = true

    // Create worker pool
    for (let i = 0; i < this.maxConcurrentBuilds; i++) {
      const worker = new BuildWorker(redis, prisma)
      this.workers.push(worker)
      this.startWorker(worker, i)
    }

    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown())
    process.on('SIGINT', () => this.shutdown())
  }

  private startWorker(worker: BuildWorker, workerId: number) {
    logger.info(`Starting build worker ${workerId + 1}/${this.maxConcurrentBuilds}`)

    const processNextJob = async () => {
      if (!this.isRunning) return

      try {
        const hasJobToProcess = await worker.processNextJob()

        if (!hasJobToProcess) {
          // No job available, wait before checking again
          setTimeout(() => processNextJob(), 2000)
        } else {
          // Job processed, immediately check for next job
          setImmediate(() => processNextJob())
        }
      } catch (error) {
        logger.error(`Worker ${workerId + 1} error`, { error })
        // Wait before retrying after error
        setTimeout(() => processNextJob(), 5000)
      }
    }

    // Start processing
    processNextJob()
  }

  private async shutdown() {
    logger.info('Shutting down Build Service')
    this.isRunning = false

    // Wait for workers to finish current jobs
    await Promise.all(this.workers.map(w => w.shutdown()))

    // Close connections
    await redis.quit()
    await prisma.$disconnect()

    logger.info('Build Service shut down successfully')
    process.exit(0)
  }
}

// Start the service
const manager = new BuildServiceManager()
manager.start().catch((error) => {
  logger.error('Failed to start Build Service', { error })
  process.exit(1)
})
