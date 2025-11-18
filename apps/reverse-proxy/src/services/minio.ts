import * as Minio from 'minio'
import { logger } from '../lib/logger'

export class MinIOService {
  private client: Minio.Client
  private bucketName: string

  constructor() {
    this.bucketName = process.env.MINIO_BUCKET_NAME || 'vercel-deployments'

    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    })
  }

  async initialize() {
    try {
      // Verify bucket exists
      const exists = await this.client.bucketExists(this.bucketName)

      if (!exists) {
        logger.warn(
          `Bucket ${this.bucketName} does not exist, attempting to create`
        )
        await this.client.makeBucket(this.bucketName, 'us-east-1')
        logger.info(`Created bucket ${this.bucketName}`)
      } else {
        logger.info(`Bucket ${this.bucketName} verified`)
      }
    } catch (error) {
      logger.error(`MinIO initialization error: ${(error as Error).message}`)
      throw error
    }
  }

  /**
   * Get presigned URL for serving static files
   */
  async getPresignedUrl(
    projectId: string,
    deploymentId: string,
    path: string
  ): Promise<string | null> {
    try {
      // Normalize path
      let objectPath = `${projectId}/${deploymentId}${path}`
      if (objectPath.endsWith('/')) {
        objectPath += 'index.html'
      }

      // Clean up path
      objectPath = objectPath.replace(/\/+/g, '/')

      logger.debug(`Getting presigned URL for: ${objectPath}`)

      // Check if object exists
      try {
        await this.client.statObject(this.bucketName, objectPath)
      } catch (error: any) {
        // If file not found, try index.html
        if (error.code === 'NotFound') {
          const indexPath = objectPath.replace(/\/$/, '') + '/index.html'
          try {
            await this.client.statObject(this.bucketName, indexPath)
            objectPath = indexPath
          } catch {
            logger.warn(`Object not found: ${objectPath}`)
            return null
          }
        } else {
          throw error
        }
      }

      // Generate presigned URL valid for 1 hour
      const url = await this.client.presignedGetObject(
        this.bucketName,
        objectPath,
        24 * 60 * 60 // 24 hours
      )

      logger.debug(`Generated presigned URL for ${objectPath}`)
      return url
    } catch (error) {
      logger.error(
        `Failed to get presigned URL: ${(error as Error).message}`
      )
      return null
    }
  }

  /**
   * List objects in a deployment
   */
  async listDeploymentObjects(
    projectId: string,
    deploymentId: string,
    prefix: string = ''
  ): Promise<string[]> {
    try {
      const objectPrefix = `${projectId}/${deploymentId}/${prefix}`
      const objects: string[] = []

      const stream = this.client.listObjects(
        this.bucketName,
        objectPrefix,
        true
      )

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          objects.push(obj.name)
        })

        stream.on('error', (error) => {
          logger.error(`List objects error: ${(error as Error).message}`)
          reject(error)
        })

        stream.on('end', () => {
          resolve(objects)
        })
      })
    } catch (error) {
      logger.error(`Failed to list deployment objects: ${(error as Error).message}`)
      return []
    }
  }

  /**
   * Get object metadata
   */
  async getObjectMetadata(
    projectId: string,
    deploymentId: string,
    objectPath: string
  ): Promise<ObjectMetadata | null> {
    try {
      const fullPath = `${projectId}/${deploymentId}${objectPath}`

      const stat = await this.client.statObject(this.bucketName, fullPath)

      return {
        size: stat.size,
        etag: stat.etag,
        lastModified: stat.lastModified.toISOString(),
        contentType: stat.metaData?.['content-type'] as string,
      }
    } catch (error) {
      logger.debug(`Failed to get object metadata: ${(error as Error).message}`)
      return null
    }
  }

  /**
   * Delete entire deployment
   */
  async deleteDeployment(
    projectId: string,
    deploymentId: string
  ): Promise<boolean> {
    try {
      const prefix = `${projectId}/${deploymentId}/`

      logger.info(`Deleting deployment: ${prefix}`)

      // List all objects
      const objectList = await this.listDeploymentObjects(projectId, deploymentId)

      if (objectList.length === 0) {
        logger.warn(`No objects found for deployment ${deploymentId}`)
        return true
      }

      // Delete all objects
      await new Promise<void>((resolve, reject) => {
        this.client.removeObjects(this.bucketName, objectList, (error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })

      logger.info(`Deleted ${objectList.length} objects for deployment ${deploymentId}`)
      return true
    } catch (error) {
      logger.error(`Failed to delete deployment: ${(error as Error).message}`)
      return false
    }
  }

  /**
   * Get deployment size
   */
  async getDeploymentSize(
    projectId: string,
    deploymentId: string
  ): Promise<number> {
    try {
      const objectList = await this.listDeploymentObjects(projectId, deploymentId)

      let totalSize = 0

      for (const objectPath of objectList) {
        const stat = await this.client.statObject(this.bucketName, objectPath)
        totalSize += stat.size
      }

      return totalSize
    } catch (error) {
      logger.error(`Failed to get deployment size: ${(error as Error).message}`)
      return 0
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.bucketExists(this.bucketName)
      return true
    } catch {
      return false
    }
  }
}

interface ObjectMetadata {
  size: number
  etag: string
  lastModified: string
  contentType?: string
}
