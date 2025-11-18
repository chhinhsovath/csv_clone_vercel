import { prisma } from '../lib/prisma'

export interface DeploymentEvent {
  type: 'started' | 'completed' | 'failed'
  deployment_id: string
  project_id: string
  status?: 'success' | 'failure' | 'in_progress'
  duration_ms?: number
  timestamp: number
}

export interface FunctionInvocationEvent {
  function_id: string
  project_id: string
  deployment_function_id: string
  status: 'success' | 'error'
  duration_ms: number
  error?: string
  timestamp: number
}

export interface BuildEvent {
  deployment_id: string
  project_id: string
  phase: 'clone' | 'install' | 'build' | 'optimize' | 'upload'
  status: 'success' | 'failure'
  start_time: number
  end_time: number
  timestamp: number
}

export interface ApiCallMetric {
  endpoint: string
  method: string
  status_code: number
  response_time_ms: number
  user_id?: string
  timestamp: number
}

/**
 * Analytics Service
 * Handles all metrics collection, aggregation, and retrieval
 */
export class AnalyticsService {
  /**
   * Record a deployment event
   */
  async recordDeploymentEvent(event: DeploymentEvent): Promise<void> {
    try {
      if (event.type === 'started') {
        // Create new deployment metric record
        await prisma.deploymentMetric.create({
          data: {
            deployment_id: event.deployment_id,
            project_id: event.project_id,
            status: 'started',
            start_time: new Date(event.timestamp),
          },
        })
      } else if (event.type === 'completed' || event.type === 'failed') {
        // Update existing deployment metric
        await prisma.deploymentMetric.update({
          where: { deployment_id: event.deployment_id },
          data: {
            status: event.status || 'in_progress',
            end_time: new Date(event.timestamp),
            duration_ms: event.duration_ms,
            updated_at: new Date(),
          },
        })
      }
    } catch (error) {
      console.error('Failed to record deployment event:', error)
    }
  }

  /**
   * Record a function invocation
   */
  async recordFunctionInvocation(
    event: FunctionInvocationEvent
  ): Promise<void> {
    try {
      // Get or create function metric
      let metric = await prisma.functionMetric.findUnique({
        where: { deployment_function_id: event.deployment_function_id },
      })

      if (!metric) {
        metric = await prisma.functionMetric.create({
          data: {
            deployment_function_id: event.deployment_function_id,
            project_id: event.project_id,
            invocation_count: 0,
            error_count: 0,
          },
        })
      }

      // Update counts
      const newInvocationCount = metric.invocation_count + 1
      const newErrorCount =
        metric.error_count + (event.status === 'error' ? 1 : 0)

      // Calculate new average execution time
      const totalExecutionTime =
        metric.avg_execution_time_ms * metric.invocation_count +
        event.duration_ms
      const newAvgTime = totalExecutionTime / newInvocationCount

      await prisma.functionMetric.update({
        where: { deployment_function_id: event.deployment_function_id },
        data: {
          invocation_count: newInvocationCount,
          avg_execution_time_ms: newAvgTime,
          error_count: newErrorCount,
          last_invoked_at: new Date(event.timestamp),
          updated_at: new Date(),
        },
      })

      // Record error if applicable
      if (event.status === 'error' && event.error) {
        await this.trackError(
          {
            message: event.error,
            stack: '',
          },
          {
            project_id: event.project_id,
            function_id: event.function_id,
            type: 'FunctionError',
          }
        )
      }
    } catch (error) {
      console.error('Failed to record function invocation:', error)
    }
  }

  /**
   * Record a build event
   */
  async recordBuildEvent(event: BuildEvent): Promise<void> {
    try {
      // Check if build metric already exists
      const existingMetric = await prisma.buildMetric.findUnique({
        where: { deployment_id: event.deployment_id },
      })

      if (!existingMetric) {
        // Create new build metric
        await prisma.buildMetric.create({
          data: {
            deployment_id: event.deployment_id,
            project_id: event.project_id,
            start_time: new Date(event.start_time),
            end_time: new Date(event.end_time),
            duration_ms: event.end_time - event.start_time,
            status: event.status,
          },
        })
      } else {
        // Update existing metric with completion info
        await prisma.buildMetric.update({
          where: { deployment_id: event.deployment_id },
          data: {
            end_time: new Date(event.end_time),
            duration_ms: event.end_time - event.start_time,
            status: event.status,
            updated_at: new Date(),
          },
        })
      }
    } catch (error) {
      console.error('Failed to record build event:', error)
    }
  }

  /**
   * Record an API call metric
   */
  async recordApiCall(metric: ApiCallMetric): Promise<void> {
    try {
      await prisma.apiMetric.create({
        data: {
          endpoint: metric.endpoint,
          method: metric.method,
          status_code: metric.status_code,
          response_time_ms: metric.response_time_ms,
          user_id: metric.user_id,
          created_at: new Date(metric.timestamp),
        },
      })
    } catch (error) {
      console.error('Failed to record API call:', error)
    }
  }

  /**
   * Track an error
   */
  async trackError(
    error: Error,
    context: {
      project_id: string
      deployment_id?: string
      function_id?: string
      type: string
    }
  ): Promise<void> {
    try {
      const severity = this.calculateErrorSeverity(error.message)

      await prisma.errorLog.create({
        data: {
          project_id: context.project_id,
          error_type: context.type,
          error_message: error.message,
          stack_trace: error.stack,
          severity,
          context: context as any,
        },
      })
    } catch (err) {
      console.error('Failed to track error:', err)
    }
  }

  /**
   * Get deployment metrics for a project
   */
  async getDeploymentMetrics(
    projectId: string,
    timeRange: { startDate: Date; endDate: Date }
  ) {
    try {
      const metrics = await prisma.deploymentMetric.findMany({
        where: {
          project_id: projectId,
          created_at: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        orderBy: { created_at: 'desc' },
      })

      const totalDeployments = metrics.length
      const successfulDeployments = metrics.filter(
        (m) => m.status === 'success'
      ).length
      const failedDeployments = metrics.filter(
        (m) => m.status === 'failure'
      ).length

      const successRate =
        totalDeployments > 0 ? (successfulDeployments / totalDeployments) * 100 : 0

      const avgDuration =
        metrics.filter((m) => m.duration_ms).length > 0
          ? metrics.reduce((sum, m) => sum + (m.duration_ms || 0), 0) /
            metrics.filter((m) => m.duration_ms).length
          : 0

      return {
        total: totalDeployments,
        successful: successfulDeployments,
        failed: failedDeployments,
        successRate: parseFloat(successRate.toFixed(2)),
        avgDuration: parseFloat(avgDuration.toFixed(0)),
        metrics,
      }
    } catch (error) {
      console.error('Failed to get deployment metrics:', error)
      throw error
    }
  }

  /**
   * Get function metrics for a project
   */
  async getFunctionMetrics(
    projectId: string,
    timeRange: { startDate: Date; endDate: Date }
  ) {
    try {
      const metrics = await prisma.functionMetric.findMany({
        where: {
          project_id: projectId,
          updated_at: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        include: {
          function: true,
        },
        orderBy: { invocation_count: 'desc' },
      })

      const totalInvocations = metrics.reduce(
        (sum, m) => sum + m.invocation_count,
        0
      )
      const totalErrors = metrics.reduce((sum, m) => sum + m.error_count, 0)
      const errorRate =
        totalInvocations > 0 ? (totalErrors / totalInvocations) * 100 : 0
      const avgExecutionTime = metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.avg_execution_time_ms, 0) / metrics.length : 0

      return {
        total_invocations: totalInvocations,
        total_errors: totalErrors,
        error_rate: parseFloat(errorRate.toFixed(2)),
        avg_execution_time: parseFloat(avgExecutionTime.toFixed(2)),
        metrics,
      }
    } catch (error) {
      console.error('Failed to get function metrics:', error)
      throw error
    }
  }

  /**
   * Get build metrics for a project
   */
  async getBuildMetrics(
    projectId: string,
    timeRange: { startDate: Date; endDate: Date }
  ) {
    try {
      const metrics = await prisma.buildMetric.findMany({
        where: {
          project_id: projectId,
          created_at: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        orderBy: { created_at: 'desc' },
      })

      const totalBuilds = metrics.length
      const successfulBuilds = metrics.filter((m) => m.status === 'success').length
      const failedBuilds = metrics.filter((m) => m.status === 'failure').length

      const buildSuccessRate =
        totalBuilds > 0 ? (successfulBuilds / totalBuilds) * 100 : 0

      const avgBuildDuration =
        metrics.filter((m) => m.duration_ms).length > 0
          ? metrics.reduce((sum, m) => sum + (m.duration_ms || 0), 0) /
            metrics.filter((m) => m.duration_ms).length
          : 0

      return {
        total: totalBuilds,
        successful: successfulBuilds,
        failed: failedBuilds,
        success_rate: parseFloat(buildSuccessRate.toFixed(2)),
        avg_duration: parseFloat(avgBuildDuration.toFixed(0)),
        metrics,
      }
    } catch (error) {
      console.error('Failed to get build metrics:', error)
      throw error
    }
  }

  /**
   * Get API performance metrics
   */
  async getApiMetrics(
    timeRange: { startDate: Date; endDate: Date }
  ) {
    try {
      const metrics = await prisma.apiMetric.findMany({
        where: {
          created_at: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        orderBy: { created_at: 'desc' },
      })

      const avgResponseTime =
        metrics.length > 0
          ? metrics.reduce((sum, m) => sum + m.response_time_ms, 0) / metrics.length
          : 0

      // Group by endpoint
      const byEndpoint = new Map<string, any>()
      metrics.forEach((m) => {
        if (!byEndpoint.has(m.endpoint)) {
          byEndpoint.set(m.endpoint, {
            endpoint: m.endpoint,
            calls: 0,
            avgTime: 0,
            successCount: 0,
          })
        }

        const endpoint = byEndpoint.get(m.endpoint)
        endpoint.calls += 1
        endpoint.avgTime =
          (endpoint.avgTime * (endpoint.calls - 1) + m.response_time_ms) /
          endpoint.calls
        if (m.status_code >= 200 && m.status_code < 300) {
          endpoint.successCount += 1
        }
      })

      return {
        total_calls: metrics.length,
        avg_response_time: parseFloat(avgResponseTime.toFixed(2)),
        by_endpoint: Array.from(byEndpoint.values()),
        metrics,
      }
    } catch (error) {
      console.error('Failed to get API metrics:', error)
      throw error
    }
  }

  /**
   * Get error metrics for a project
   */
  async getErrorMetrics(
    projectId: string,
    timeRange: { startDate: Date; endDate: Date }
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
        orderBy: { created_at: 'desc' },
      })

      const totalErrors = errors.length
      const unresolvedErrors = errors.filter((e) => !e.resolved).length

      // Group by severity
      const bySeverity = new Map<string, number>()
      errors.forEach((e) => {
        bySeverity.set(e.severity, (bySeverity.get(e.severity) || 0) + 1)
      })

      // Group by type
      const byType = new Map<string, number>()
      errors.forEach((e) => {
        byType.set(e.error_type, (byType.get(e.error_type) || 0) + 1)
      })

      return {
        total: totalErrors,
        unresolved: unresolvedErrors,
        by_severity: Object.fromEntries(bySeverity),
        by_type: Object.fromEntries(byType),
        errors,
      }
    } catch (error) {
      console.error('Failed to get error metrics:', error)
      throw error
    }
  }

  /**
   * Get project overview with all key metrics
   */
  async getProjectOverview(projectId: string) {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const now = new Date()

      const timeRange = { startDate: thirtyDaysAgo, endDate: now }

      const [deploymentMetrics, functionMetrics, buildMetrics, errorMetrics] =
        await Promise.all([
          this.getDeploymentMetrics(projectId, timeRange),
          this.getFunctionMetrics(projectId, timeRange),
          this.getBuildMetrics(projectId, timeRange),
          this.getErrorMetrics(projectId, timeRange),
        ])

      return {
        project_id: projectId,
        time_range: { startDate: thirtyDaysAgo, endDate: now },
        deployments: {
          total: deploymentMetrics.total,
          success_rate: deploymentMetrics.successRate,
          avg_duration_ms: deploymentMetrics.avgDuration,
        },
        functions: {
          total_invocations: functionMetrics.total_invocations,
          error_rate: functionMetrics.error_rate,
          avg_execution_time_ms: functionMetrics.avg_execution_time,
        },
        builds: {
          total: buildMetrics.total,
          success_rate: buildMetrics.success_rate,
          avg_duration_ms: buildMetrics.avg_duration,
        },
        errors: {
          total: errorMetrics.total,
          unresolved: errorMetrics.unresolved,
          by_severity: errorMetrics.by_severity,
        },
      }
    } catch (error) {
      console.error('Failed to get project overview:', error)
      throw error
    }
  }

  /**
   * Calculate error severity based on message
   */
  private calculateErrorSeverity(
    message: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const lowerMessage = message.toLowerCase()

    if (
      lowerMessage.includes('fatal') ||
      lowerMessage.includes('critical') ||
      lowerMessage.includes('crash')
    ) {
      return 'critical'
    }

    if (
      lowerMessage.includes('error') ||
      lowerMessage.includes('failed') ||
      lowerMessage.includes('exception')
    ) {
      return 'high'
    }

    if (
      lowerMessage.includes('warning') ||
      lowerMessage.includes('deprecated')
    ) {
      return 'medium'
    }

    return 'low'
  }
}
