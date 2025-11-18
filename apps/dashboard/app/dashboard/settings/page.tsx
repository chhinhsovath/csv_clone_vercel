'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/auth-store'
import { useRouter } from 'next/navigation'
import { User, LogOut, Settings } from 'lucide-react'

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your account and preferences</p>
      </div>

      {/* Account Section */}
      <div className="card p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Account</h2>
            <p className="text-slate-600 text-sm">Your account information</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {/* Email */}
          <div className="pb-4 border-b border-slate-200">
            <p className="text-sm text-slate-500 uppercase tracking-wide">Email</p>
            <p className="text-slate-900 font-medium mt-1">{user?.email}</p>
          </div>

          {/* Name */}
          <div className="pb-4 border-b border-slate-200">
            <p className="text-sm text-slate-500 uppercase tracking-wide">Name</p>
            <p className="text-slate-900 font-medium mt-1">
              {user?.name || 'Not set'}
            </p>
          </div>

          {/* User ID */}
          <div>
            <p className="text-sm text-slate-500 uppercase tracking-wide">User ID</p>
            <p className="text-slate-700 font-mono text-sm mt-1">{user?.id}</p>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Contact support to change your email or password
        </p>
      </div>

      {/* GitHub Integration Section */}
      <div className="card p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">GitHub Integration</h2>
            <p className="text-slate-600 text-sm">Connect and manage your GitHub account</p>
          </div>
        </div>

        <p className="text-sm text-slate-700 mb-4">
          Connect your GitHub account to enable automatic deployments when you push code.
        </p>

        <Link
          href="/dashboard/settings/github"
          className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-md transition-colors"
        >
          Manage GitHub
        </Link>
      </div>

      {/* Preferences Section */}
      <div className="card p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
            <Settings className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Preferences</h2>
            <p className="text-slate-600 text-sm">Customize your dashboard experience</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Theme */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <p className="font-medium text-slate-900">Theme</p>
              <p className="text-sm text-slate-600">Light mode</p>
            </div>
            <input type="checkbox" className="w-4 h-4" disabled />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <p className="font-medium text-slate-900">Email Notifications</p>
              <p className="text-sm text-slate-600">Deployment status updates</p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4" disabled />
          </div>

          {/* API Access */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">API Keys</p>
              <p className="text-sm text-slate-600">Manage API access tokens</p>
            </div>
            <button className="text-brand-500 hover:text-brand-600 text-sm font-medium">
              Manage
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card p-8 border-red-200 bg-red-50">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <LogOut className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Danger Zone</h2>
            <p className="text-slate-600 text-sm">Irreversible actions</p>
          </div>
        </div>

        <p className="text-sm text-slate-700 mb-4">
          Sign out from your account and end your session.
        </p>

        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors inline-flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-slate-500">
        <p>Version 0.1.0</p>
        <p className="mt-2">
          Need help? Contact{' '}
          <a href="mailto:support@vercel-clone.local" className="text-brand-500 hover:text-brand-600">
            support
          </a>
        </p>
      </div>
    </div>
  )
}
