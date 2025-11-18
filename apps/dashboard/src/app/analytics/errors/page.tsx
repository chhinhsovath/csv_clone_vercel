'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface ErrorMetrics {
  total: number
  unresolved: number
  by_severity: Record<string, number>
  by_type: any[]
  errors: any[]
  trends: any[]
  stats: any
  time_range: { days: number }
}

export default function ErrorsAnalytics() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const days = searchParams.get('days') || '30'

  const [metrics, setMetrics] = useState<ErrorMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState<Set<string>>(new Set())

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

        const response = await fetch(`/api/analytics/errors/${projectId}?days=${days}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch error metrics')
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
  }, [projectId, days, router])

  const handleMarkResolved = async (errorId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      setResolving((prev) => new Set([...prev, errorId]))

      const response = await fetch(`/api/errors/${errorId}/resolve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Remove from list
        setMetrics((prev) =>
          prev
            ? { ...prev, errors: prev.errors.filter((e) => e.id !== errorId) }
            : null
        )
      }
    } catch (err) {
      console.error('Failed to mark error resolved:', err)
    } finally {
      setResolving((prev) => {
        const next = new Set(prev)
        next.delete(errorId)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading error metrics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Link href={`/analytics?projectId=${projectId}`} className="text-blue-600 hover:underline">
            Back to Analytics
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

  const { stats, by_type, errors } = metrics

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/analytics?projectId=${projectId}`} className="text-blue-600 hover:underline mb-4 block">
            ← Back to Analytics
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Error Tracking</h1>
          <p className="text-gray-600">Last {days} days</p>
        </div>

        {/* Error Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Total Errors</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Critical Errors</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{stats.by_severity.critical || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">High Priority</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">{stats.by_severity.high || 0}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm font-medium">Unresolved</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.unresolved}</p>
          </div>
        </div>

        {/* Error Types Breakdown */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Errors by Type</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Critical</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">High</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {by_type.map((errorType: any) => (
                  <tr key={errorType.type} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{errorType.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{errorType.count}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-red-600 font-medium">{errorType.by_severity.critical || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-orange-600 font-medium">{errorType.by_severity.high || 0}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Error Details */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent Errors</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {errors.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No errors found</div>
            ) : (
              errors.map((err: any) => (
                <div key={err.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{err.error_message}</h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            err.severity === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : err.severity === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {err.severity}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{err.error_type}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(err.created_at).toLocaleString()}
                      </p>
                      {err.stack_trace && (
                        <details className="mt-3">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                            View Stack Trace
                          </summary>
                          <pre className="text-xs bg-gray-100 p-3 mt-2 overflow-auto rounded text-gray-700">
                            {err.stack_trace}
                          </pre>
                        </details>
                      )}
                    </div>
                    {!err.resolved && (
                      <button
                        onClick={() => handleMarkResolved(err.id)}
                        disabled={resolving.has(err.id)}
                        className="ml-4 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {resolving.has(err.id) ? 'Marking...' : 'Resolve'}
                      </button>
                    )}
                    {err.resolved && (
                      <span className="ml-4 px-3 py-1 text-sm bg-green-100 text-green-800 rounded">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
