'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useGitHubStore } from '@/lib/github-store'
import { ArrowLeft, Github, Check, X } from 'lucide-react'

export default function GitHubSettingsPage() {
  const {
    info,
    isLoading,
    error,
    fetchGitHubInfo,
    getAuthorizationUrl,
    disconnect,
    clearError,
  } = useGitHubStore()

  const [isInitialized, setIsInitialized] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    if (!isInitialized) {
      fetchGitHubInfo()
      setIsInitialized(true)
    }
  }, [isInitialized, fetchGitHubInfo])

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      clearError()
      const { url } = await getAuthorizationUrl()
      // Redirect to GitHub OAuth
      window.location.href = url
    } catch (err) {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your GitHub account?')) {
      return
    }
    try {
      await disconnect()
    } catch (err) {
      // Error already shown
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/dashboard/settings" className="flex items-center gap-2 text-brand-500 hover:text-brand-600 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Back to settings
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">GitHub Integration</h1>
        <p className="text-slate-600 mt-1">Connect your GitHub account for auto-deployment</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* GitHub Connection Card */}
      <div className="card p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center">
            <Github className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">GitHub Account</h2>
            <p className="text-slate-600 text-sm">
              {info?.connected
                ? 'Connected to your GitHub account'
                : 'Connect to enable auto-deployment on push'}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wide mb-1">Connection Status</p>
              <div className="flex items-center gap-2">
                {info?.connected ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-600" />
                    <span className="text-slate-900 font-medium">Connected</span>
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-600">Not connected</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Connection Details */}
        {info?.connected && (
          <div className="space-y-4 mb-6 pb-6 border-b border-slate-200">
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wide">Username</p>
              <p className="text-slate-900 font-medium mt-1">@{info.username}</p>
            </div>
            {info.connected_at && (
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wide">Connected</p>
                <p className="text-slate-600 text-sm mt-1">
                  {new Date(info.connected_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          {info?.connected ? (
            <>
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-600 rounded-md transition-colors disabled:opacity-50"
              >
                Disconnect
              </button>
              <button
                className="px-4 py-2 text-slate-600 disabled:opacity-50 cursor-not-allowed"
                disabled
              >
                Already Connected
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting || isLoading}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              <Github className="w-5 h-5" />
              {isConnecting ? 'Connecting...' : 'Connect with GitHub'}
            </button>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-semibold text-blue-900 mb-2">What happens after connecting?</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Automatic webhooks will be set up on your repositories</li>
          <li>New pushes to your project branches will trigger deployments</li>
          <li>You can select which repositories to link to projects</li>
          <li>Your GitHub token is securely encrypted and stored</li>
        </ul>
      </div>

      {/* Security Note */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
        <h3 className="font-semibold text-amber-900 mb-2">Security Note</h3>
        <p className="text-sm text-amber-800">
          We only request access to your repositories and cannot access private data. Your GitHub token is encrypted and stored securely.
        </p>
      </div>
    </div>
  )
}
