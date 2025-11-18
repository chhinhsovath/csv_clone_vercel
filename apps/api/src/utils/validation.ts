/**
 * Input validation and sanitization utilities
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 * Requires: at least 8 chars, 1 uppercase, 1 lowercase, 1 number
 */
export function isValidPassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate project name
 */
export function isValidProjectName(name: string): boolean {
  return name.length >= 1 && name.length <= 100
}

/**
 * Validate domain name
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i
  return domainRegex.test(domain)
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate GitHub repository URL
 */
export function isValidGitHubUrl(url: string): boolean {
  return (
    url.startsWith('https://github.com/') &&
    url.split('/').length >= 5 &&
    !url.endsWith('/')
  )
}

/**
 * Sanitize string input (prevent XSS)
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate pagination parameters
 */
export function isValidPagination(limit: number, offset: number): boolean {
  return limit > 0 && limit <= 100 && offset >= 0
}

/**
 * Validate CUID (Prisma default ID format)
 */
export function isValidCUID(id: string): boolean {
  // CUID format: c[timestamp][random][counter][fingerprint]
  return /^c[0-9a-z]{24}$/.test(id)
}

/**
 * Validate function name
 */
export function isValidFunctionName(name: string): boolean {
  // Allow alphanumeric, hyphens, underscores
  // Start with letter
  return /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(name)
}

/**
 * Validate environment variable key
 */
export function isValidEnvKey(key: string): boolean {
  // Must be uppercase with optional underscores
  return /^[A-Z_][A-Z0-9_]*$/.test(key)
}

/**
 * Validate JavaScript code snippet (basic)
 */
export function isValidJavaScriptCode(code: string): boolean {
  // Basic validation - check for common syntax
  try {
    new Function(code)
    return true
  } catch {
    return false
  }
}

/**
 * Validate deployment status
 */
export function isValidDeploymentStatus(
  status: string
): status is 'queued' | 'building' | 'deploying' | 'success' | 'failed' {
  return ['queued', 'building', 'deploying', 'success', 'failed'].includes(status)
}

/**
 * Validate error severity
 */
export function isValidErrorSeverity(
  severity: string
): severity is 'low' | 'medium' | 'high' | 'critical' {
  return ['low', 'medium', 'high', 'critical'].includes(severity)
}

/**
 * Validate alert type
 */
export function isValidAlertType(
  type: string
): type is 'error_rate' | 'deployment_failure' | 'function_error' | 'slow_deployment' {
  return [
    'error_rate',
    'deployment_failure',
    'function_error',
    'slow_deployment',
  ].includes(type)
}

/**
 * Validate build command
 */
export function isValidBuildCommand(command: string): boolean {
  // Must not contain dangerous shell operators
  const dangerousPatterns = [';', '|', '&', '>', '<', '`', '$()']
  return !dangerousPatterns.some((pattern) => command.includes(pattern))
}

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Validation schema builder
 */
export class ValidationSchema {
  private rules: Map<string, (value: any) => { valid: boolean; error?: string }> = new Map()

  addRule(field: string, validator: (value: any) => boolean | { valid: boolean; error?: string }) {
    this.rules.set(field, (value) => {
      const result = validator(value)
      if (typeof result === 'boolean') {
        return {
          valid: result,
          error: result ? undefined : `${field} is invalid`,
        }
      }
      return result
    })
    return this
  }

  validate(data: Record<string, any>): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {}

    for (const [field, validator] of this.rules.entries()) {
      const result = validator(data[field])
      if (!result.valid && result.error) {
        errors[field] = result.error
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    }
  }
}

/**
 * Common validation schemas
 */
export const ValidationSchemas = {
  project: new ValidationSchema()
    .addRule('name', (value) => isValidProjectName(value))
    .addRule('git_repo_url', (value) => isValidGitHubUrl(value))
    .addRule('build_command', (value) => isValidBuildCommand(value)),

  domain: new ValidationSchema()
    .addRule('domain_name', (value) => isValidDomain(value)),

  user: new ValidationSchema()
    .addRule('email', (value) => isValidEmail(value))
    .addRule('password', (value) => isValidPassword(value).valid),

  function: new ValidationSchema()
    .addRule('function_name', (value) => isValidFunctionName(value)),

  alert: new ValidationSchema()
    .addRule('name', (value) => typeof value === 'string' && value.length > 0)
    .addRule('type', (value) => isValidAlertType(value))
    .addRule('condition', (value) => typeof value === 'number' && value > 0)
    .addRule('time_window', (value) => typeof value === 'number' && value > 0),
}

/**
 * Rate limit validation for requests
 */
export function validateRateLimit(count: number, limit: number, period: number): boolean {
  return count <= limit
}

/**
 * File size validation
 */
export function isValidFileSize(sizeInBytes: number, maxSizeInMB: number): boolean {
  const maxBytes = maxSizeInMB * 1024 * 1024
  return sizeInBytes <= maxBytes
}

/**
 * Sanitize object (recursively)
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key])
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key])
    }
  }

  return sanitized
}
