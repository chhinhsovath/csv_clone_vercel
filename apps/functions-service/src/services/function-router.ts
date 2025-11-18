import axios from 'axios'
import { logger } from '../lib/logger'

export interface RouteInfo {
  projectId: string
  functionName: string
  isFunction: boolean
}

export class FunctionRouter {
  private apiEndpoint: string
  private routeCache: Map<string, CachedRoute> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.apiEndpoint = process.env.API_ENDPOINT || 'http://localhost:9000'
  }

  async initialize() {
    logger.info('Function router initialized')
    // Start cache cleanup interval
    setInterval(() => this.cleanupCache(), this.cacheTimeout)
  }

  /**
   * Resolve a request path to a function
   * Supports both /api/v1/functions/projectId/functionName and /_functions/functionName formats
   */
  async resolveRoute(
    projectId: string,
    pathSegments: string[]
  ): Promise<RouteInfo | null> {
    try {
      // Check if this is a function request
      // Patterns:
      // /_functions/functionName
      // /api/v1/functions/functionName

      if (pathSegments.length === 0) {
        return null
      }

      let functionName: string | null = null

      if (pathSegments[0] === '_functions' && pathSegments.length > 1) {
        functionName = pathSegments[1]
      } else if (
        pathSegments[0] === 'api' &&
        pathSegments[1] === 'v1' &&
        pathSegments[2] === 'functions' &&
        pathSegments.length > 3
      ) {
        functionName = pathSegments[3]
      }

      if (!functionName) {
        return null
      }

      // Check cache
      const cacheKey = `${projectId}:${functionName}`
      const cached = this.getFromCache(cacheKey)

      if (cached) {
        logger.debug(`Using cached route: ${cacheKey}`)
        return {
          projectId,
          functionName,
          isFunction: true,
        }
      }

      // Verify function exists via API
      const exists = await this.verifyFunctionExists(projectId, functionName)

      if (exists) {
        // Cache the route
        this.cacheRoute(cacheKey)

        return {
          projectId,
          functionName,
          isFunction: true,
        }
      }

      return null
    } catch (error) {
      logger.error(`Route resolution error: ${(error as Error).message}`)
      return null
    }
  }

  /**
   * Verify that a function exists
   */
  private async verifyFunctionExists(
    projectId: string,
    functionName: string
  ): Promise<boolean> {
    try {
      const response = await axios.head(
        `${this.apiEndpoint}/api/functions/${projectId}/${functionName}`,
        {
          timeout: 5000,
        }
      )

      return response.status === 200
    } catch (error) {
      return false
    }
  }

  /**
   * Get all functions for a project
   */
  async getProjectFunctions(
    projectId: string
  ): Promise<Array<{ name: string; enabled: boolean }>> {
    try {
      const response = await axios.get(
        `${this.apiEndpoint}/api/functions/projects/${projectId}`,
        {
          timeout: 5000,
        }
      )

      if (response.status === 200 && Array.isArray(response.data.functions)) {
        return response.data.functions.map((fn: any) => ({
          name: fn.function_name,
          enabled: fn.is_active,
        }))
      }

      return []
    } catch (error) {
      logger.debug(`Failed to get project functions: ${(error as Error).message}`)
      return []
    }
  }

  /**
   * Cache route information
   */
  private cacheRoute(cacheKey: string) {
    this.routeCache.set(cacheKey, {
      cachedAt: Date.now(),
    })
  }

  /**
   * Get from cache if fresh
   */
  private getFromCache(cacheKey: string): CachedRoute | null {
    const cached = this.routeCache.get(cacheKey)

    if (!cached) {
      return null
    }

    // Check if cache is still fresh
    if (Date.now() - cached.cachedAt > this.cacheTimeout) {
      this.routeCache.delete(cacheKey)
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

    this.routeCache.forEach((value, key) => {
      if (now - value.cachedAt > this.cacheTimeout) {
        expired.push(key)
      }
    })

    expired.forEach((key) => this.routeCache.delete(key))

    if (expired.length > 0) {
      logger.debug(`Cleaned up ${expired.length} expired route cache entries`)
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.routeCache.size,
      timeout: this.cacheTimeout,
    }
  }
}

interface CachedRoute {
  cachedAt: number
}
