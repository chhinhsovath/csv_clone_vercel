import axios from 'axios'
import { logger } from '../lib/logger'

export interface FunctionMetadata {
  name: string
  runtime: string
  memoryMb: number
  timeoutSeconds: number
  handler: string
}

export class FunctionRegistry {
  private apiEndpoint: string
  private functionCache: Map<string, CachedFunction> = new Map()
  private cacheTimeout = 10 * 60 * 1000 // 10 minutes

  constructor() {
    this.apiEndpoint = process.env.API_ENDPOINT || 'http://localhost:9000'
  }

  async initialize() {
    logger.info('Function registry initialized')
    // Start cache cleanup interval
    setInterval(() => this.cleanupCache(), this.cacheTimeout)
  }

  /**
   * Get function code from the API/storage
   */
  async getFunction(projectId: string, functionName: string): Promise<string | null> {
    try {
      const cacheKey = `${projectId}:${functionName}`

      // Check cache first
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        logger.debug(`Using cached function code: ${cacheKey}`)
        return cached.code
      }

      // Fetch from API
      logger.debug(`Fetching function code: ${cacheKey}`)

      const response = await axios.get(
        `${this.apiEndpoint}/api/functions/code/${projectId}/${functionName}`,
        {
          timeout: 5000,
        }
      )

      if (response.status === 200 && response.data.code) {
        const code = response.data.code

        // Cache the result
        this.cacheFunction(cacheKey, code)

        return code
      }

      return null
    } catch (error) {
      logger.error(
        `Failed to get function code: ${(error as Error).message}`
      )
      return null
    }
  }

  /**
   * Get function metadata
   */
  async getMetadata(
    projectId: string,
    functionName: string
  ): Promise<FunctionMetadata | null> {
    try {
      const response = await axios.get(
        `${this.apiEndpoint}/api/functions/${projectId}/${functionName}`,
        {
          timeout: 5000,
        }
      )

      if (response.status === 200 && response.data.function) {
        return response.data.function
      }

      return null
    } catch (error) {
      logger.error(
        `Failed to get function metadata: ${(error as Error).message}`
      )
      return null
    }
  }

  /**
   * Register a new function (called by build service)
   */
  async registerFunction(
    projectId: string,
    functionName: string,
    filePath: string,
    runtime: string
  ): Promise<boolean> {
    try {
      logger.info(
        `Registering function: ${projectId}/${functionName}`,
        { filePath, runtime }
      )

      const response = await axios.post(
        `${this.apiEndpoint}/api/functions/register`,
        {
          project_id: projectId,
          function_name: functionName,
          file_path: filePath,
          runtime,
        },
        {
          timeout: 5000,
        }
      )

      return response.status === 201
    } catch (error) {
      logger.error(`Failed to register function: ${(error as Error).message}`)
      return false
    }
  }

  /**
   * Update function code
   */
  async updateFunction(
    projectId: string,
    functionName: string,
    code: string
  ): Promise<boolean> {
    try {
      const response = await axios.put(
        `${this.apiEndpoint}/api/functions/${projectId}/${functionName}/code`,
        { code },
        {
          timeout: 5000,
        }
      )

      if (response.status === 200) {
        // Invalidate cache
        const cacheKey = `${projectId}:${functionName}`
        this.functionCache.delete(cacheKey)
        return true
      }

      return false
    } catch (error) {
      logger.error(`Failed to update function: ${(error as Error).message}`)
      return false
    }
  }

  /**
   * Cache function code
   */
  private cacheFunction(cacheKey: string, code: string) {
    this.functionCache.set(cacheKey, {
      code,
      cachedAt: Date.now(),
    })
  }

  /**
   * Get from cache if fresh
   */
  private getFromCache(cacheKey: string): CachedFunction | null {
    const cached = this.functionCache.get(cacheKey)

    if (!cached) {
      return null
    }

    // Check if cache is still fresh
    if (Date.now() - cached.cachedAt > this.cacheTimeout) {
      this.functionCache.delete(cacheKey)
      return null
    }

    return cached
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache() {
    const now = Date.now()
    const expired: string[] = []

    this.functionCache.forEach((value, key) => {
      if (now - value.cachedAt > this.cacheTimeout) {
        expired.push(key)
      }
    })

    expired.forEach((key) => this.functionCache.delete(key))

    if (expired.length > 0) {
      logger.debug(`Cleaned up ${expired.length} expired cache entries`)
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.functionCache.size,
      timeout: this.cacheTimeout,
    }
  }
}

interface CachedFunction {
  code: string
  cachedAt: number
}
