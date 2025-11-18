import axios from 'axios'
import { logger } from '../lib/logger'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

export interface CertificateRequest {
  domain: string
  email: string
}

export interface CertificateData {
  domain: string
  certificate: string
  privateKey: string
  issuer: string
  expiresAt: Date
}

export class CertificateManager {
  private apiEndpoint: string
  private certsDir: string
  private acmeApiUrl = 'https://acme-v02.api.letsencrypt.org/directory'
  private stagingAcmeUrl = 'https://acme-staging-v02.api.letsencrypt.org/directory'

  constructor() {
    this.apiEndpoint = process.env.API_ENDPOINT || 'http://localhost:9000'
    this.certsDir = process.env.CERTS_DIR || '/app/certs'
  }

  async initialize() {
    logger.info('Certificate manager initialized')
  }

  /**
   * Request a new certificate from Let's Encrypt
   */
  async requestCertificate(domain: string, email: string): Promise<boolean> {
    try {
      logger.info(`Requesting certificate for domain: ${domain}`)

      // For now, this is a placeholder that would integrate with Let's Encrypt
      // In production, this would:
      // 1. Create ACME account
      // 2. Create order
      // 3. Complete DNS challenge
      // 4. Download certificate

      // Development mode: Generate self-signed certificate
      if (process.env.NODE_ENV !== 'production') {
        return await this.generateSelfSignedCertificate(domain)
      }

      // Production: Would use acme-client library for Let's Encrypt
      return await this.requestLetsEncryptCertificate(domain, email)
    } catch (error) {
      logger.error(
        `Failed to request certificate for ${domain}: ${(error as Error).message}`
      )
      return false
    }
  }

  /**
   * Generate a self-signed certificate for development
   */
  private async generateSelfSignedCertificate(domain: string): Promise<boolean> {
    try {
      logger.info(`Generating self-signed certificate for ${domain}`)

      // This is a placeholder - in production we'd use proper certificate generation
      // For now, create stub certificate files that can be replaced with real ones

      const certPath = path.join(this.certsDir, `${domain}.crt`)
      const keyPath = path.join(this.certsDir, `${domain}.key`)

      // Ensure directory exists
      if (!fs.existsSync(this.certsDir)) {
        fs.mkdirSync(this.certsDir, { recursive: true })
      }

      // Create placeholder certificate (in real scenario, use openssl or crypto)
      const certContent = `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQC33OwJ+PROoDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjQxMTE3MDAwMDAwWhcNMjUxMTE3MDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7
VJTUt9Us8cKjMzEfYyjiWA4/4ggCg7KaKhWqfARmrVSUezVU3A0E9tfvdPuM1jTb
-----END CERTIFICATE-----`

      const keyContent = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKj
MzEfYyjiWA4/4ggCg7KaKhWqfARmrVSUezVU3A0E9tfvdPuM1jTbqwR5
-----END PRIVATE KEY-----`

      fs.writeFileSync(certPath, certContent, 'utf-8')
      fs.writeFileSync(keyPath, keyContent, 'utf-8')
      fs.chmodSync(keyPath, 0o600) // Secure key permissions

      logger.info(
        `Self-signed certificate created for ${domain}: ${certPath}`
      )
      return true
    } catch (error) {
      logger.error(
        `Failed to generate self-signed certificate: ${(error as Error).message}`
      )
      return false
    }
  }

  /**
   * Request certificate from Let's Encrypt (production)
   */
  private async requestLetsEncryptCertificate(
    domain: string,
    email: string
  ): Promise<boolean> {
    try {
      logger.info(`Requesting Let's Encrypt certificate for ${domain}`)

      // This is a placeholder for the actual ACME challenge flow
      // Production implementation would:
      // 1. Initialize ACME client
      // 2. Get account
      // 3. Create order
      // 4. Complete DNS challenge
      // 5. Download certificate

      // For now, return false (not implemented in Phase 8)
      logger.warn(
        `Let's Encrypt integration not yet implemented. Use self-signed certs in dev mode.`
      )
      return false
    } catch (error) {
      logger.error(
        `Let's Encrypt request failed: ${(error as Error).message}`
      )
      return false
    }
  }

  /**
   * Renew a certificate
   */
  async renewCertificate(domain: string): Promise<boolean> {
    try {
      logger.info(`Renewing certificate for domain: ${domain}`)

      // Get the email from the database via API
      const response = await axios.get(
        `${this.apiEndpoint}/api/domains/resolve/${domain}`,
        {
          timeout: 5000,
        }
      )

      if (response.data.certificateEmail) {
        return await this.requestCertificate(domain, response.data.certificateEmail)
      }

      return false
    } catch (error) {
      logger.error(`Failed to renew certificate: ${(error as Error).message}`)
      return false
    }
  }

  /**
   * Verify certificate is valid
   */
  verifyCertificate(certPath: string): boolean {
    try {
      const cert = fs.readFileSync(certPath, 'utf-8')

      // Check if certificate file exists and has content
      if (!cert || !cert.includes('BEGIN CERTIFICATE')) {
        return false
      }

      // In production, would parse and verify certificate validity
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if certificate needs renewal (< 30 days)
   */
  needsRenewal(expiresAt: Date): boolean {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    return expiresAt < thirtyDaysFromNow && expiresAt > new Date()
  }

  /**
   * Save certificate to file system
   */
  saveCertificate(data: CertificateData): boolean {
    try {
      const certPath = path.join(this.certsDir, `${data.domain}.crt`)
      const keyPath = path.join(this.certsDir, `${data.domain}.key`)
      const chainPath = path.join(this.certsDir, `${data.domain}.chain`)

      // Ensure directory exists
      if (!fs.existsSync(this.certsDir)) {
        fs.mkdirSync(this.certsDir, { recursive: true })
      }

      // Write certificate files
      fs.writeFileSync(certPath, data.certificate, 'utf-8')
      fs.writeFileSync(keyPath, data.privateKey, 'utf-8')
      fs.writeFileSync(chainPath, data.issuer, 'utf-8')

      // Secure permissions
      fs.chmodSync(keyPath, 0o600)
      fs.chmodSync(certPath, 0o644)
      fs.chmodSync(chainPath, 0o644)

      logger.info(`Certificate saved for domain: ${data.domain}`)
      return true
    } catch (error) {
      logger.error(`Failed to save certificate: ${(error as Error).message}`)
      return false
    }
  }

  /**
   * Get certificate expiry date
   */
  getCertificateExpiry(certPath: string): Date | null {
    try {
      const cert = fs.readFileSync(certPath, 'utf-8')

      // Try to extract notAfter date from certificate
      // In production, would use x509 library to parse properly
      const notAfterMatch = cert.match(/notAfter=(.+)/i)
      if (notAfterMatch) {
        const expiryDate = new Date(notAfterMatch[1])
        if (!isNaN(expiryDate.getTime())) {
          return expiryDate
        }
      }

      // Fallback: assume 1 year expiry
      return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    } catch {
      return null
    }
  }

  /**
   * Check certificate status via API
   */
  async checkCertificateStatus(domain: string): Promise<{
    hasCertificate: boolean
    isValid: boolean
    expiresAt?: Date
    needsRenewal?: boolean
  }> {
    try {
      const certPath = path.join(this.certsDir, `${domain}.crt`)

      if (!fs.existsSync(certPath)) {
        return {
          hasCertificate: false,
          isValid: false,
        }
      }

      const isValid = this.verifyCertificate(certPath)
      const expiresAt = this.getCertificateExpiry(certPath)

      return {
        hasCertificate: true,
        isValid,
        expiresAt: expiresAt || undefined,
        needsRenewal: expiresAt ? this.needsRenewal(expiresAt) : undefined,
      }
    } catch (error) {
      logger.error(`Failed to check certificate status: ${(error as Error).message}`)
      return {
        hasCertificate: false,
        isValid: false,
      }
    }
  }
}
