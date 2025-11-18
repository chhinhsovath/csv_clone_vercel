'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'

export default function Home() {
  const router = useRouter()
  const { user, loadUser } = useAuthStore()

  useEffect(() => {
    // Load user from localStorage on mount
    loadUser().then(() => {
      // Redirect to dashboard or login
      if (user) {
        router.push('/dashboard')
      } else {
        router.push('/auth/login')
      }
    })
  }, [router, user, loadUser])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full"></div>
      </div>
    </div>
  )
}
