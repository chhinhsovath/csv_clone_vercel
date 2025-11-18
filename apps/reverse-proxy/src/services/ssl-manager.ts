import fs from 'fs'
import path from 'path'
import { logger } from '../lib/logger'

export interface CertificateInfo {
  domain: string
  certPath: string
  keyPath: string
  expiresAt: Date
  isValid: boolean
}

export class SSLManager {
  private certsDir: string
  private certificates: Map<string, CertificateInfo> = new Map()

  constructor() {
    this.certsDir = process.env.CERTS_DIR || '/app/certs'
  }

  async initialize() {
    try {
      // Create certs directory if it doesn't exist
      if (!fs.existsSync(this.certsDir)) {
        fs.mkdirSync(this.certsDir, { recursive: true })
        logger.info(`Created certificates directory: ${this.certsDir}`)
      }

      // Load existing certificates
      await this.loadCertificates()
      logger.info('SSL manager initialized')
    } catch (error) {
      logger.error(`SSL manager initialization error: ${(error as Error).message}`)
      throw error
    }
  }

  /**
   * Load certificates from filesystem
   */
  private async loadCertificates() {
    try {
      if (!fs.existsSync(this.certsDir)) {
        logger.warn(`Certificates directory does not exist: ${this.certsDir}`)
        return
      }

      const files = fs.readdirSync(this.certsDir)

      // Look for cert pairs (domain.crt + domain.key)
      const certFiles = files.filter((f) => f.endsWith('.crt'))

      for (const certFile of certFiles) {
        const domain = certFile.replace('.crt', '')
        const certPath = path.join(this.certsDir, certFile)
        const keyPath = path.join(this.certsDir, `${domain}.key`)

        if (fs.existsSync(keyPath)) {
          const expiry = this.extractCertificateExpiry(certPath)
          const isValid = expiry > new Date()

          this.certificates.set(domain, {
            domain,
            certPath,
            keyPath,
            expiresAt: expiry,
            isValid,
          })

          logger.info(
            `Loaded certificate for ${domain}, expires: ${expiry.toISOString()}`
          )
        }
      }

      logger.info(`Loaded ${this.certificates.size} certificates`)
    } catch (error) {
      logger.error(`Failed to load certificates: ${(error as Error).message}`)
    }
  }

  /**
   * Extract expiry date from certificate
   */
  private extractCertificateExpiry(certPath: string): Date {
    try {
      // This would normally use openssl or crypto to parse the certificate
      // For now, return a placeholder date (Phase 8 implementation)
      const certContent = fs.readFileSync(certPath, 'utf-8')

      // Try to extract expiry from certificate content (basic parsing)
      // This is simplified - production should use proper crypto library
      const expiryMatch = certContent.match(/notAfter=(.+)/i)
      if (expiryMatch) {
        return new Date(expiryMatch[1])
      }

      return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // Default to 1 year
    } catch {
      return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }
  }

  /**
   * Get certificate for domain
   */
  getCertificate(domain: string): CertificateInfo | null {
    return this.certificates.get(domain) || null
  }

  /**
   * Check if domain has valid certificate
   */
  hasCertificate(domain: string): boolean {
    const cert = this.certificates.get(domain)
    return cert ? cert.isValid : false
  }

  /**
   * Get all certificates
   */
  getAllCertificates(): CertificateInfo[] {
    return Array.from(this.certificates.values())
  }

  /**
   * Check for expiring certificates (within 30 days)
   */
  getExpiringCertificates(): CertificateInfo[] {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    return Array.from(this.certificates.values()).filter(
      (cert) => cert.expiresAt < thirtyDaysFromNow && cert.expiresAt > new Date()
    )
  }

  /**
   * Placeholder for certificate renewal (implemented in Phase 8)
   */
  async requestCertificate(domain: string): Promise<boolean> {
    logger.info(`Certificate request for ${domain} - to be implemented in Phase 8`)
    return false
  }

  /**
   * Save certificate from Let's Encrypt (Phase 8)
   */
  async saveCertificate(
    domain: string,
    cert: string,
    key: string
  ): Promise<boolean> {
    try {
      const certPath = path.join(this.certsDir, `${domain}.crt`)
      const keyPath = path.join(this.certsDir, `${domain}.key`)

      fs.writeFileSync(certPath, cert, 'utf-8')
      fs.writeFileSync(keyPath, key, 'utf-8')
      fs.chmodSync(keyPath, 0o600) // Only owner can read private key

      const expiry = this.extractCertificateExpiry(certPath)

      this.certificates.set(domain, {
        domain,
        certPath,
        keyPath,
        expiresAt: expiry,
        isValid: true,
      })

      logger.info(`Saved certificate for ${domain}`)
      return true
    } catch (error) {
      logger.error(`Failed to save certificate: ${(error as Error).message}`)
      return false
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      return fs.existsSync(this.certsDir)
    } catch {
      return false
    }
  }
}
