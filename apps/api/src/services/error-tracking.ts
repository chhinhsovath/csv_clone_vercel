import { prisma } from '../lib/prisma'

export interface AlertConfig {
  name: string
  type: 'error_rate' | 'deployment_failure' | 'function_error' | 'slow_deployment'
  condition: number // threshold value
  time_window: number // minutes
  notification_channels?: string[] // email, webhook, etc
}

export interface ErrorContext {
  project_id: string
  deployment_id?: string
  function_id?: string
  endpoint?: string
  user_id?: string
}

/**
 * Error Tracking Service
 * Manages error logging, trending, and alerting
 */
export class ErrorTracker {
  /**
   * Track an error
   */
  async trackError(
    error: Error,
    context: ErrorContext,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string> {
    try {
      const errorLog = await prisma.errorLog.create({
        data: {
          project_id: context.project_id,
          error_type: error.constructor.name,
          error_message: error.message,
          stack_trace: error.stack,
          severity,
          context: context as any,
        },
      })

      // Check if any alerts should be triggered
      await this.checkAlertsForError(context.project_id, errorLog.id)

      return errorLog.id
    } catch (err) {
      console.error('Failed to track error:', err)
      throw err
    }
  }

  /**
   * Get errors for a project with optional filtering
   */
  async getErrors(
    projectId: string,
    filters: {
      type?: string
      severity?: string
      resolved?: boolean
      limit?: number
      offset?: number
    } = {}
  ) {
    try {
      const { type, severity, resolved, limit = 50, offset = 0 } = filters

      const where: any = { project_id: projectId }

      if (type) where.error_type = type
      if (severity) where.severity = severity
      if (resolved !== undefined) where.resolved = resolved

      const [errors, total] = await Promise.all([
        prisma.errorLog.findMany({
          where,
          orderBy: { created_at: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.errorLog.count({ where }),
      ])

      return {
        errors,
        total,
        limit,
        offset,
        page: Math.floor(offset / limit) + 1,
      }
    } catch (error) {
      console.error('Failed to get errors:', error)
      throw error
    }
  }

  /**
   * Get error trends over time
   */
  async getErrorTrends(
    projectId: string,
    timeRange: { startDate: Date; endDate: Date },
    bucketSize: 'hour' | 'day' = 'day'
  ) {
    try {
      const errors = await prisma.errorLog.findMany({
        where: {
          project_id: projectId,
          created_at: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        select: {
          id: true,
          severity: true,
          created_at: true,
        },
        orderBy: { created_at: 'asc' },
      })

      // Group errors by time bucket
      const buckets = new Map<string, { count: number; by_severity: Record<string, number> }>()

      errors.forEach((error) => {
        let bucketKey: string

        if (bucketSize === 'hour') {
          const date = new Date(error.created_at)
          date.setMinutes(0, 0, 0)
          bucketKey = date.toISOString()
        } else {
          const date = new Date(error.created_at)
          date.setHours(0, 0, 0, 0)
          bucketKey = date.toISOString().split('T')[0]
        }

        if (!buckets.has(bucketKey)) {
          buckets.set(bucketKey, { count: 0, by_severity: {} })
        }

        const bucket = buckets.get(bucketKey)!
        bucket.count += 1
        bucket.by_severity[error.severity] = (bucket.by_severity[error.severity] || 0) + 1
      })

      // Convert to array and sort by date
      const trends = Array.from(buckets.entries())
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      return trends
    } catch (error) {
      console.error('Failed to get error trends:', error)
      throw error
    }
  }

  /**
   * Group errors by type
   */
  async groupErrorsByType(projectId: string) {
    try {
      const errors = await prisma.errorLog.findMany({
        where: { project_id: projectId },
        select: { error_type: true, id: true, severity: true },
      })

      const grouped = new Map<
        string,
        { count: number; by_severity: Record<string, number> }
      >()

      errors.forEach((error) => {
        if (!grouped.has(error.error_type)) {
          grouped.set(error.error_type, { count: 0, by_severity: {} })
        }

        const group = grouped.get(error.error_type)!
        group.count += 1
        group.by_severity[error.severity] = (group.by_severity[error.severity] || 0) + 1
      })

      return Array.from(grouped.entries()).map(([type, data]) => ({
        type,
        ...data,
      }))
    } catch (error) {
      console.error('Failed to group errors by type:', error)
      throw error
    }
  }

  /**
   * Create an alert configuration
   */
  async createAlert(projectId: string, config: AlertConfig) {
    try {
      const alert = await prisma.alert.create({
        data: {
          project_id: projectId,
          name: config.name,
          type: config.type,
          condition: config.condition,
          time_window: config.time_window,
          notification_channels: config.notification_channels
            ? JSON.stringify(config.notification_channels)
            : null,
        },
      })

      return alert
    } catch (error) {
      console.error('Failed to create alert:', error)
      throw error
    }
  }

  /**
   * Get alerts for a project
   */
  async getAlerts(projectId: string) {
    try {
      const alerts = await prisma.alert.findMany({
        where: { project_id: projectId },
        orderBy: { created_at: 'desc' },
      })

      return alerts.map((alert) => ({
        ...alert,
        notification_channels: alert.notification_channels
          ? JSON.parse(alert.notification_channels)
          : [],
      }))
    } catch (error) {
      console.error('Failed to get alerts:', error)
      throw error
    }
  }

  /**
   * Update an alert
   */
  async updateAlert(
    alertId: string,
    updates: Partial<AlertConfig>
  ) {
    try {
      const alert = await prisma.alert.update({
        where: { id: alertId },
        data: {
          ...(updates.name && { name: updates.name }),
          ...(updates.condition && { condition: updates.condition }),
          ...(updates.time_window && { time_window: updates.time_window }),
          ...(updates.notification_channels && {
            notification_channels: JSON.stringify(updates.notification_channels),
          }),
        },
      })

      return alert
    } catch (error) {
      console.error('Failed to update alert:', error)
      throw error
    }
  }

  /**
   * Delete an alert
   */
  async deleteAlert(alertId: string): Promise<boolean> {
    try {
      await prisma.alert.delete({
        where: { id: alertId },
      })
      return true
    } catch (error) {
      console.error('Failed to delete alert:', error)
      return false
    }
  }

  /**
   * Toggle alert enabled status
   */
  async toggleAlert(alertId: string): Promise<boolean> {
    try {
      const alert = await prisma.alert.findUnique({
        where: { id: alertId },
      })

      if (!alert) return false

      await prisma.alert.update({
        where: { id: alertId },
        data: { enabled: !alert.enabled },
      })

      return true
    } catch (error) {
      console.error('Failed to toggle alert:', error)
      return false
    }
  }

  /**
   * Mark error as resolved
   */
  async markErrorResolved(errorId: string): Promise<boolean> {
    try {
      await prisma.errorLog.update({
        where: { id: errorId },
        data: { resolved: true, updated_at: new Date() },
      })
      return true
    } catch (error) {
      console.error('Failed to mark error resolved:', error)
      return false
    }
  }

  /**
   * Check if any alerts should be triggered
   */
  private async checkAlertsForError(projectId: string, errorId: string): Promise<void> {
    try {
      const alerts = await this.getAlerts(projectId)

      for (const alert of alerts) {
        if (!alert.enabled) continue

        let shouldTrigger = false

        // Calculate metrics for the time window
        const timeWindowMs = alert.time_window * 60 * 1000
        const windowStart = new Date(Date.now() - timeWindowMs)

        const recentErrors = await prisma.errorLog.count({
          where: {
            project_id: projectId,
            created_at: { gte: windowStart },
          },
        })

        // Check alert condition
        if (alert.type === 'error_rate') {
          const totalErrors = await prisma.errorLog.count({
            where: { project_id: projectId, created_at: { gte: windowStart } },
          })
          const errorRate = totalErrors > 0 ? (recentErrors / totalErrors) * 100 : 0
          shouldTrigger = errorRate > alert.condition
        }

        if (shouldTrigger) {
          await this.sendAlert(alert, {
            project_id: projectId,
            error_count: recentErrors,
            threshold: alert.condition,
          })
        }
      }
    } catch (error) {
      console.error('Failed to check alerts:', error)
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlert(
    alert: any,
    data: any
  ): Promise<void> {
    try {
      const channels = alert.notification_channels || []

      // Mark alert as triggered
      await prisma.alert.update({
        where: { id: alert.id },
        data: { last_triggered: new Date() },
      })

      console.log(`Alert triggered: ${alert.name}`, data)

      // Send notifications via configured channels
      // This is a placeholder - actual implementation would send emails/webhooks
      for (const channel of channels) {
        if (channel === 'email') {
          // Send email notification
          console.log(`Email alert sent for: ${alert.name}`)
        } else if (channel === 'webhook') {
          // Send webhook notification
          console.log(`Webhook alert sent for: ${alert.name}`)
        }
      }
    } catch (error) {
      console.error('Failed to send alert:', error)
    }
  }

  /**
   * Get critical errors that need immediate attention
   */
  async getCriticalErrors(projectId: string, limit: number = 10) {
    try {
      const errors = await prisma.errorLog.findMany({
        where: {
          project_id: projectId,
          severity: { in: ['critical', 'high'] },
          resolved: false,
        },
        orderBy: { created_at: 'desc' },
        take: limit,
      })

      return errors
    } catch (error) {
      console.error('Failed to get critical errors:', error)
      throw error
    }
  }

  /**
   * Get error statistics
   */
  async getErrorStats(projectId: string) {
    try {
      const [total, unresolved, critical, high, medium, low] = await Promise.all([
        prisma.errorLog.count({ where: { project_id: projectId } }),
        prisma.errorLog.count({
          where: { project_id: projectId, resolved: false },
        }),
        prisma.errorLog.count({
          where: { project_id: projectId, severity: 'critical' },
        }),
        prisma.errorLog.count({
          where: { project_id: projectId, severity: 'high' },
        }),
        prisma.errorLog.count({
          where: { project_id: projectId, severity: 'medium' },
        }),
        prisma.errorLog.count({
          where: { project_id: projectId, severity: 'low' },
        }),
      ])

      return {
        total,
        unresolved,
        by_severity: { critical, high, medium, low },
      }
    } catch (error) {
      console.error('Failed to get error stats:', error)
      throw error
    }
  }
}
