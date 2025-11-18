'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface Alert {
  id: string
  name: string
  type: string
  condition: number
  time_window: number
  enabled: boolean
  notification_channels: string[]
  last_triggered: string | null
  created_at: string
}

export default function AlertsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')

  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [toggling, setToggling] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState({
    name: '',
    type: 'error_rate',
    condition: 10,
    time_window: 60,
    notification_channels: [] as string[],
  })

  useEffect(() => {
    fetchAlerts()
  }, [projectId, router])

  const fetchAlerts = async () => {
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

      const response = await fetch(`/api/analytics/alerts/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch alerts')
      }

      const data = await response.json()
      setAlerts(data.alerts)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/analytics/alerts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          ...formData,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create alert')
      }

      const data = await response.json()
      setAlerts([data.alert, ...alerts])
      setFormData({
        name: '',
        type: 'error_rate',
        condition: 10,
        time_window: 60,
        notification_channels: [],
      })
      setShowForm(false)
    } catch (err) {
      console.error('Failed to create alert:', err)
    }
  }

  const handleToggleAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      setToggling((prev) => new Set([...prev, alertId]))

      const response = await fetch(`/api/analytics/alerts/${alertId}/toggle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === alertId ? { ...alert, enabled: !alert.enabled } : alert
          )
        )
      }
    } catch (err) {
      console.error('Failed to toggle alert:', err)
    } finally {
      setToggling((prev) => {
        const next = new Set(prev)
        next.delete(alertId)
        return next
      })
    }
  }

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      if (!confirm('Are you sure you want to delete this alert?')) return

      setDeleting((prev) => new Set([...prev, alertId]))

      const response = await fetch(`/api/analytics/alerts/${alertId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))
      }
    } catch (err) {
      console.error('Failed to delete alert:', err)
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev)
        next.delete(alertId)
        return next
      })
    }
  }

  const alertTypes = [
    { value: 'error_rate', label: 'High Error Rate' },
    { value: 'deployment_failure', label: 'Deployment Failures' },
    { value: 'function_error', label: 'Function Errors' },
    { value: 'slow_deployment', label: 'Slow Deployments' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading alerts...</p>
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/analytics?projectId=${projectId}`} className="text-blue-600 hover:underline mb-4 block">
            ← Back to Analytics
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Alert Management</h1>
              <p className="text-gray-600">Configure alerts for your project</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {showForm ? 'Cancel' : 'Create Alert'}
            </button>
          </div>
        </div>

        {/* Create Alert Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Alert</h2>
            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alert Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., High error rate alert"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alert Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {alertTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Threshold</label>
                  <input
                    type="number"
                    value={formData.condition}
                    onChange={(e) =>
                      setFormData({ ...formData, condition: parseFloat(e.target.value) })
                    }
                    placeholder="e.g., 10"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Window (minutes)</label>
                  <input
                    type="number"
                    value={formData.time_window}
                    onChange={(e) =>
                      setFormData({ ...formData, time_window: parseInt(e.target.value) })
                    }
                    placeholder="e.g., 60"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notification Channels</label>
                <div className="space-y-2">
                  {['email', 'webhook'].map((channel) => (
                    <label key={channel} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.notification_channels.includes(channel)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              notification_channels: [...formData.notification_channels, channel],
                            })
                          } else {
                            setFormData({
                              ...formData,
                              notification_channels: formData.notification_channels.filter(
                                (c) => c !== channel
                              ),
                            })
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{channel}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Create Alert
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Alerts List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Active Alerts ({alerts.length})</h2>
          </div>

          {alerts.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No alerts configured. Create one to get started.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{alert.name}</h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            alert.enabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {alert.enabled ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Type: <span className="font-medium">{alert.type}</span> | Threshold:{' '}
                        <span className="font-medium">{alert.condition}</span> | Window:{' '}
                        <span className="font-medium">{alert.time_window}m</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Channels: {alert.notification_channels.join(', ') || 'None'}
                      </p>
                      {alert.last_triggered && (
                        <p className="text-xs text-gray-400 mt-1">
                          Last triggered: {new Date(alert.last_triggered).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleToggleAlert(alert.id)}
                        disabled={toggling.has(alert.id)}
                        className="px-3 py-1 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        {toggling.has(alert.id) ? 'Updating...' : alert.enabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDeleteAlert(alert.id)}
                        disabled={deleting.has(alert.id)}
                        className="px-3 py-1 text-sm rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleting.has(alert.id) ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
