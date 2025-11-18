import axios from 'axios'
import { logger } from '../lib/logger'
import { prisma } from '../lib/prisma'

export interface CertificateStatus {
  domain: string
  hasCertificate: boolean
  isValid: boolean
  expiresAt?: Date
  needsRenewal?: boolean
  status: 'pending' | 'active' | 'failed' | 'renewing'
}

export class CertificateService {
  private proxyEndpoint: string

  constructor() {
    this.proxyEndpoint = process.env.REVERSE_PROXY_ENDPOINT || 'http://localhost:3000'
  }

  /**
   * Request a certificate for a domain
   */
  async requestCertificate(
    domainId: string,
    domain: string,
    email: string
  ): Promise<boolean> {
    try {
      logger.info(`Requesting certificate for domain: ${domain}`)

      // Update domain status to pending
      await prisma.domain.update({
        where: { id: domainId },
        data: { ssl_status: 'pending' },
      })

      // Call reverse proxy to request certificate
      const response = await axios.post(
        `${this.proxyEndpoint}/api/certificates/request`,
        {
          domain,
          email,
        },
        {
          timeout: 30000,
        }
      )

      if (response.status === 200 && response.data.success) {
        // Update domain status to active
        await prisma.domain.update({
          where: { id: domainId },
          data: {
            ssl_status: 'active',
            ssl_expires_at: new Date(response.data.expiresAt),
          },
        })

        logger.info(`Certificate requested successfully for ${domain}`)
        return true
      }

      // Update to failed status
      await prisma.domain.update({
        where: { id: domainId },
        data: { ssl_status: 'failed' },
      })

      return false
    } catch (error) {
      logger.error(`Failed to request certificate: ${(error as Error).message}`)

      // Update to failed status
      await prisma.domain.update({
        where: { id: domainId },
        data: { ssl_status: 'failed' },
      })

      return false
    }
  }

  /**
   * Check certificate status
   */
  async checkCertificateStatus(domain: string): Promise<CertificateStatus> {
    try {
      logger.debug(`Checking certificate status for: ${domain}`)

      const response = await axios.get(
        `${this.proxyEndpoint}/api/certificates/status/${domain}`,
        {
          timeout: 5000,
        }
      )

      if (response.status === 200) {
        return response.data
      }

      return {
        domain,
        hasCertificate: false,
        isValid: false,
        status: 'failed',
      }
    } catch (error) {
      logger.debug(
        `Failed to check certificate status: ${(error as Error).message}`
      )

      return {
        domain,
        hasCertificate: false,
        isValid: false,
        status: 'failed',
      }
    }
  }

  /**
   * Renew a certificate
   */
  async renewCertificate(domainId: string, domain: string): Promise<boolean> {
    try {
      logger.info(`Renewing certificate for domain: ${domain}`)

      // Update status to renewing
      await prisma.domain.update({
        where: { id: domainId },
        data: { ssl_status: 'renewing' },
      })

      const response = await axios.post(
        `${this.proxyEndpoint}/api/certificates/renew`,
        { domain },
        {
          timeout: 30000,
        }
      )

      if (response.status === 200 && response.data.success) {
        // Update domain status back to active
        await prisma.domain.update({
          where: { id: domainId },
          data: {
            ssl_status: 'active',
            ssl_expires_at: new Date(response.data.expiresAt),
          },
        })

        logger.info(`Certificate renewed successfully for ${domain}`)
        return true
      }

      // Update to failed status
      await prisma.domain.update({
        where: { id: domainId },
        data: { ssl_status: 'failed' },
      })

      return false
    } catch (error) {
      logger.error(`Failed to renew certificate: ${(error as Error).message}`)

      // Update to failed status
      await prisma.domain.update({
        where: { id: domainId },
        data: { ssl_status: 'failed' },
      })

      return false
    }
  }

  /**
   * Check all certificates for renewal (30 days before expiry)
   */
  async checkCertificatesForRenewal(): Promise<void> {
    try {
      logger.debug('Checking certificates for renewal...')

      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const domainsToRenew = await prisma.domain.findMany({
        where: {
          is_verified: true,
          ssl_expires_at: {
            lte: thirtyDaysFromNow,
            gt: new Date(), // Only if not already expired
          },
        },
      })

      logger.info(
        `Found ${domainsToRenew.length} certificates needing renewal`
      )

      for (const domain of domainsToRenew) {
        try {
          // Get email from project user (or default)
          const project = await prisma.project.findUnique({
            where: { id: domain.project_id },
            select: { user_id: true },
          })

          if (project) {
            const user = await prisma.user.findUnique({
              where: { id: project.user_id || '' },
              select: { email: true },
            })

            if (user) {
              await this.renewCertificate(domain.id, domain.domain_name)
            }
          }
        } catch (error) {
          logger.error(
            `Error renewing certificate for ${domain.domain_name}: ${(error as Error).message}`
          )
        }
      }
    } catch (error) {
      logger.error(
        `Error checking certificates for renewal: ${(error as Error).message}`
      )
    }
  }

  /**
   * Get certificate info for dashboard
   */
  async getDomainCertificateInfo(domainId: string): Promise<{
    domain_name: string
    ssl_status: string
    ssl_expires_at: Date | null
    days_until_expiry?: number
  } | null> {
    try {
      const domain = await prisma.domain.findUnique({
        where: { id: domainId },
        select: {
          domain_name: true,
          ssl_status: true,
          ssl_expires_at: true,
        },
      })

      if (!domain) {
        return null
      }

      const result: any = {
        ...domain,
      }

      if (domain.ssl_expires_at) {
        const now = Date.now()
        const expiryTime = domain.ssl_expires_at.getTime()
        const daysUntilExpiry = Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24))
        result.days_until_expiry = daysUntilExpiry
      }

      return result
    } catch (error) {
      logger.error(`Failed to get domain certificate info: ${(error as Error).message}`)
      return null
    }
  }
}
