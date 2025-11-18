'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface DashboardMetrics {
  overview: any
  recent_deployments: any[]
  critical_errors: any[]
}

export default function AnalyticsDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!projectId) {
        setError('Project ID is required')
        setLoading(false)
        return
      }

      try {
        const token = localStorage.getItem('token')
        if (!token) {
          router.push('/login')
          return
        }

        const response = await fetch(`/api/analytics/dashboard/${projectId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch analytics')
        }

        const data = await response.json()
        setMetrics(data.data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [projectId, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Link href="/projects" className="text-blue-600 hover:underline">
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">No data available</p>
      </div>
    )
  }

  const { overview, recent_deployments, critical_errors } = metrics

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Last 30 days metrics</p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Deployment Success Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Deployment Success Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {overview.deployments.success_rate}%
                </p>
              </div>
              <div className="text-4xl">📈</div>
            </div>
          </div>

          {/* Average Deployment Duration */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Avg Deployment Time</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {Math.round(overview.deployments.avg_duration_ms / 1000)}s
                </p>
              </div>
              <div className="text-4xl">⏱️</div>
            </div>
          </div>

          {/* Function Invocations */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Function Invocations</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {overview.functions.total_invocations}
                </p>
              </div>
              <div className="text-4xl">⚡</div>
            </div>
          </div>

          {/* Critical Errors */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Critical Errors</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {overview.errors.by_severity.critical || 0}
                </p>
              </div>
              <div className="text-4xl">🚨</div>
            </div>
          </div>
        </div>

        {/* Section Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link
            href={`/analytics/deployments?projectId=${projectId}`}
            className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <h3 className="font-semibold text-gray-900 mb-2">Deployments</h3>
            <p className="text-gray-600 text-sm">View deployment analytics and trends</p>
          </Link>

          <Link
            href={`/analytics/functions?projectId=${projectId}`}
            className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <h3 className="font-semibold text-gray-900 mb-2">Functions</h3>
            <p className="text-gray-600 text-sm">Monitor function invocations</p>
          </Link>

          <Link
            href={`/analytics/errors?projectId=${projectId}`}
            className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <h3 className="font-semibold text-gray-900 mb-2">Errors</h3>
            <p className="text-gray-600 text-sm">Track and resolve errors</p>
          </Link>

          <Link
            href={`/analytics/alerts?projectId=${projectId}`}
            className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <h3 className="font-semibold text-gray-900 mb-2">Alerts</h3>
            <p className="text-gray-600 text-sm">Manage alert configurations</p>
          </Link>
        </div>

        {/* Recent Deployments */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Deployments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recent_deployments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                      No deployments yet
                    </td>
                  </tr>
                ) : (
                  recent_deployments.map((deployment) => (
                    <tr key={deployment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            deployment.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : deployment.status === 'failure'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {deployment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(deployment.start_time).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {deployment.duration_ms ? Math.round(deployment.duration_ms / 1000) + 's' : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Critical Errors */}
        {critical_errors.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Critical Errors</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {critical_errors.map((error) => (
                <div key={error.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{error.error_message}</p>
                      <p className="text-xs text-gray-500 mt-1">{error.error_type}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(error.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        error.severity === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {error.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
