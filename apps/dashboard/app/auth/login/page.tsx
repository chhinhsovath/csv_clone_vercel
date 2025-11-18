'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/auth-store'
import { Lock, Mail } from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isLoading, error } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitError, setSubmitError] = useState('')

  const fromPage = searchParams.get('from') || '/dashboard'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    if (!email || !password) {
      setSubmitError('Please fill in all fields')
      return
    }

    try {
      await login(email, password)
      router.push(fromPage)
    } catch (err: any) {
      setSubmitError(err.response?.data?.error?.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-900 mb-2">
            Vercel Clone
          </h1>
          <p className="text-brand-600">Deploy your applications with ease</p>
        </div>

        {/* Login Card */}
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Welcome back</h2>

          {/* Error Message */}
          {(submitError || error) && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">
                {submitError || error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-slate-300 text-white font-medium py-2 px-4 rounded-md transition-colors mt-6"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-sm text-slate-500">or</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {/* Sign Up Link */}
          <p className="text-center text-slate-600">
            Don't have an account?{' '}
            <Link
              href="/auth/signup"
              className="text-brand-500 hover:text-brand-600 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-white border border-slate-200 rounded-md">
          <p className="text-sm text-slate-600 mb-2">
            <strong>Demo credentials:</strong>
          </p>
          <p className="text-xs text-slate-500">
            Email: test@example.com<br />
            Password: password123
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}
