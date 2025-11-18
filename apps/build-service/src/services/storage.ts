import * as fs from 'fs'
import * as path from 'path'
import { Client as MinioClient } from 'minio'
import { logger } from '@/lib/logger'

export class StorageService {
  private minioClient: MinioClient
  private bucketName: string

  constructor() {
    this.bucketName = process.env.MINIO_BUCKET_NAME || 'vercel-deployments'

    // Initialize MinIO client
    this.minioClient = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT || 'minio',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    })
  }

  /**
   * Ensure bucket exists
   */
  async ensureBucket(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName)

      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1')
        logger.info('Created MinIO bucket', { bucket: this.bucketName })
      }
    } catch (error: any) {
      logger.error('Failed to ensure bucket', {
        error: error.message,
        bucket: this.bucketName,
      })
      throw error
    }
  }

  /**
   * Upload deployment artifacts to MinIO
   */
  async uploadDeployment(
    projectId: string,
    deploymentId: string,
    buildDir: string
  ): Promise<{
    fileCount: number
    totalSize: number
  }> {
    try {
      await this.ensureBucket()

      logger.info('Starting upload to MinIO', {
        project: projectId,
        deployment: deploymentId,
        buildDir,
      })

      let fileCount = 0
      let totalSize = 0

      const uploadRecursively = async (dir: string, prefix = '') => {
        const files = fs.readdirSync(dir)

        for (const file of files) {
          const filePath = path.join(dir, file)
          const objectName = prefix ? `${prefix}/${file}` : file
          const stat = fs.statSync(filePath)

          if (stat.isDirectory()) {
            await uploadRecursively(filePath, objectName)
          } else {
            const fullObjectName = `${projectId}/${deploymentId}/${objectName}`
            const fileSize = stat.size

            try {
              await this.minioClient.fPutObject(
                this.bucketName,
                fullObjectName,
                filePath,
                {
                  'Content-Type': this.getMimeType(file),
                  'Cache-Control': this.getCacheControl(file),
                }
              )

              fileCount++
              totalSize += fileSize

              logger.info('Uploaded file', {
                object: fullObjectName,
                size: fileSize,
              })
            } catch (uploadError: any) {
              logger.error('Failed to upload file', {
                object: fullObjectName,
                error: uploadError.message,
              })
              throw uploadError
            }
          }
        }
      }

      await uploadRecursively(buildDir)

      logger.info('Upload completed', {
        deployment: deploymentId,
        fileCount,
        totalSize,
      })

      return { fileCount, totalSize }
    } catch (error: any) {
      logger.error('Failed to upload deployment', {
        error: error.message,
        project: projectId,
        deployment: deploymentId,
      })
      throw new Error(`Failed to upload deployment: ${error.message}`)
    }
  }

  /**
   * Delete deployment artifacts
   */
  async deleteDeployment(projectId: string, deploymentId: string): Promise<void> {
    try {
      logger.info('Deleting deployment from storage', {
        project: projectId,
        deployment: deploymentId,
      })

      const objectsList: string[] = []

      // List all objects with the deployment prefix
      const stream = this.minioClient.listObjects(
        this.bucketName,
        `${projectId}/${deploymentId}/`,
        true
      )

      stream.on('data', (obj) => {
        objectsList.push(obj.name)
      })

      await new Promise((resolve, reject) => {
        stream.on('end', resolve)
        stream.on('error', reject)
      })

      // Delete all objects
      if (objectsList.length > 0) {
        await this.minioClient.removeObjects(this.bucketName, objectsList)
        logger.info('Deleted deployment files', {
          deployment: deploymentId,
          count: objectsList.length,
        })
      }
    } catch (error: any) {
      logger.error('Failed to delete deployment', {
        error: error.message,
        project: projectId,
        deployment: deploymentId,
      })
      throw error
    }
  }

  /**
   * Get MIME type for file
   */
  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.mjs': 'application/javascript',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
    }

    return mimeTypes[ext] || 'application/octet-stream'
  }

  /**
   * Get cache control header based on file type
   */
  private getCacheControl(filename: string): string {
    if (filename.includes('.')) {
      const ext = path.extname(filename).toLowerCase()
      // Hash-based files can be cached forever
      if (filename.match(/\.[a-f0-9]{8}\./)) {
        return 'public, max-age=31536000, immutable'
      }
      // HTML files should not be cached
      if (ext === '.html') {
        return 'public, max-age=0, must-revalidate'
      }
      // Other assets: cache for 1 year
      return 'public, max-age=31536000'
    }

    return 'public, max-age=3600'
  }
}
