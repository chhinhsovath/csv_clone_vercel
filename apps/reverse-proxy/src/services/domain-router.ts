import axios from 'axios'
import { logger } from '../lib/logger'

export interface RoutingInfo {
  success: boolean
  projectId?: string
  deploymentId?: string
  error?: string
  isDynamic?: boolean
  customDomain?: boolean
}

export class DomainRouter {
  private apiEndpoint: string
  private rootDomain: string
  private domainCache: Map<string, CachedDomain> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  constructor() {
    this.apiEndpoint = process.env.API_ENDPOINT || 'http://localhost:9000'
    this.rootDomain = process.env.ROOT_DOMAIN || 'vercel-clone.local'
  }

  async initialize() {
    logger.info('Domain router initialized')
    // Start cache cleanup interval
    setInterval(() => this.cleanupCache(), this.cacheTimeout)
  }

  /**
   * Resolve incoming request to deployment
   */
  async resolveRequest(
    host: string,
    path: string,
    method: string,
    headers: Record<string, any>,
    body?: any
  ): Promise<RoutingInfo> {
    try {
      // Remove port from host if present
      const hostname = host.split(':')[0].toLowerCase()

      logger.debug(`Resolving domain: ${hostname}`)

      // Check cache first
      const cached = this.getFromCache(hostname)
      if (cached) {
        logger.debug(`Using cached routing for ${hostname}`)
        return {
          success: true,
          projectId: cached.projectId,
          deploymentId: cached.deploymentId,
          isDynamic: cached.isDynamic,
          customDomain: cached.isCustom,
        }
      }

      // Check if dynamic subdomain (project-name.root-domain)
      if (hostname.endsWith(this.rootDomain)) {
        const subdomain = hostname.substring(
          0,
          hostname.length - this.rootDomain.length - 1
        )

        if (subdomain) {
          return this.resolveDynamicSubdomain(subdomain, hostname)
        }
      }

      // Check if custom domain
      return this.resolveCustomDomain(hostname)
    } catch (error) {
      logger.error(`Domain resolution error: ${(error as Error).message}`)
      return {
        success: false,
        error: 'Failed to resolve domain',
      }
    }
  }

  /**
   * Resolve dynamic subdomains: project-name.root-domain.com
   */
  private async resolveDynamicSubdomain(
    subdomain: string,
    hostname: string
  ): Promise<RoutingInfo> {
    try {
      // Extract project identifier from subdomain
      // Format: [deployment-id]-[project-id].root-domain.com
      // or: [project-id].root-domain.com → use latest deployment

      const parts = subdomain.split('-')

      if (parts.length < 1) {
        return {
          success: false,
          error: 'Invalid subdomain format',
        }
      }

      let projectId: string
      let deploymentId: string | null = null

      // Try to parse as [deployment-id]-[project-id]
      if (parts.length >= 2) {
        const potentialDeploymentId = parts[0]
        const potentialProjectId = parts.slice(1).join('-')

        // Query API to verify deployment exists
        const result = await this.queryDeployment(
          potentialProjectId,
          potentialDeploymentId
        )

        if (result.success) {
          projectId = potentialProjectId
          deploymentId = potentialDeploymentId
        } else {
          // Fallback: treat entire subdomain as project ID
          projectId = subdomain
          deploymentId = null
        }
      } else {
        projectId = subdomain
        deploymentId = null
      }

      // If no deployment specified, get latest
      if (!deploymentId) {
        const latest = await this.getLatestDeployment(projectId)
        if (!latest) {
          return {
            success: false,
            error: 'No deployments found for project',
          }
        }
        deploymentId = latest
      }

      // Cache the result
      this.cacheResult(hostname, projectId, deploymentId, true, false)

      return {
        success: true,
        projectId,
        deploymentId,
        isDynamic: true,
      }
    } catch (error) {
      logger.error(`Dynamic subdomain resolution error: ${(error as Error).message}`)
      return {
        success: false,
        error: 'Failed to resolve subdomain',
      }
    }
  }

  /**
   * Resolve custom domains
   */
  private async resolveCustomDomain(hostname: string): Promise<RoutingInfo> {
    try {
      // Query API for custom domain mapping
      const response = await axios.get(
        `${this.apiEndpoint}/api/domains/resolve/${hostname}`
      )

      if (response.status === 200 && response.data.success) {
        const { projectId, deploymentId } = response.data

        // Cache the result
        this.cacheResult(hostname, projectId, deploymentId, false, true)

        return {
          success: true,
          projectId,
          deploymentId,
          isDynamic: false,
          customDomain: true,
        }
      }

      return {
        success: false,
        error: 'Custom domain not found',
      }
    } catch (error) {
      logger.debug(`Custom domain lookup failed: ${(error as Error).message}`)
      return {
        success: false,
        error: 'Custom domain not found',
      }
    }
  }

  /**
   * Query API for deployment info
   */
  private async queryDeployment(
    projectId: string,
    deploymentId: string
  ): Promise<{ success: boolean }> {
    try {
      const response = await axios.get(
        `${this.apiEndpoint}/api/deployments/${deploymentId}`,
        {
          params: { projectId },
          timeout: 5000,
        }
      )

      return {
        success: response.status === 200,
      }
    } catch {
      return {
        success: false,
      }
    }
  }

  /**
   * Get latest deployment for a project
   */
  private async getLatestDeployment(projectId: string): Promise<string | null> {
    try {
      const response = await axios.get(
        `${this.apiEndpoint}/api/deployments/projects/${projectId}`,
        {
          params: { limit: 1 },
          timeout: 5000,
        }
      )

      if (response.data.deployments && response.data.deployments.length > 0) {
        return response.data.deployments[0].id
      }

      return null
    } catch (error) {
      logger.debug(`Failed to get latest deployment: ${(error as Error).message}`)
      return null
    }
  }

  /**
   * Cache result for performance
   */
  private cacheResult(
    hostname: string,
    projectId: string,
    deploymentId: string,
    isDynamic: boolean,
    isCustom: boolean
  ) {
    this.domainCache.set(hostname, {
      projectId,
      deploymentId,
      isDynamic,
      isCustom,
      cachedAt: Date.now(),
    })
  }

  /**
   * Get from cache if fresh
   */
  private getFromCache(hostname: string): CachedDomain | null {
    const cached = this.domainCache.get(hostname)

    if (!cached) {
      return null
    }

    // Check if cache is still fresh
    if (Date.now() - cached.cachedAt > this.cacheTimeout) {
      this.domainCache.delete(hostname)
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

    this.domainCache.forEach((value, key) => {
      if (now - value.cachedAt > this.cacheTimeout) {
        expired.push(key)
      }
    })

    expired.forEach((key) => this.domainCache.delete(key))

    if (expired.length > 0) {
      logger.debug(`Cleaned up ${expired.length} expired cache entries`)
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.domainCache.size,
      timeout: this.cacheTimeout,
    }
  }
}

interface CachedDomain {
  projectId: string
  deploymentId: string
  isDynamic: boolean
  isCustom: boolean
  cachedAt: number
}
