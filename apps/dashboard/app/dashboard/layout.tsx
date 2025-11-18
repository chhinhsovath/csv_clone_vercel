'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/auth-store'
import { LogOut, Menu, X, Home, Settings } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, logout, loadUser, isLoading } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    // Load user on mount
    loadUser()
  }, [loadUser])

  // Check if user is logged in
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/login')
    }
  }, [user, isLoading, router])

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-500 rounded-lg"></div>
              <span className="font-bold text-lg hidden sm:inline">Vercel Clone</span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink href="/dashboard" icon={<Home className="w-4 h-4" />}>
                Dashboard
              </NavLink>
              <NavLink href="/dashboard/settings" icon={<Settings className="w-4 h-4" />}>
                Settings
              </NavLink>
            </div>

            {/* User Menu */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm text-slate-600">{user.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign out</span>
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {menuOpen && (
            <div className="md:hidden pb-4 border-t border-slate-200">
              <MobileNavLink href="/dashboard" onClick={() => setMenuOpen(false)}>
                Dashboard
              </MobileNavLink>
              <MobileNavLink href="/dashboard/settings" onClick={() => setMenuOpen(false)}>
                Settings
              </MobileNavLink>
              <div className="pt-4 border-t border-slate-200 mt-4">
                <p className="text-sm text-slate-600 px-2 py-2">{user.email}</p>
                <button
                  onClick={() => {
                    handleLogout()
                    setMenuOpen(false)
                  }}
                  className="w-full text-left px-2 py-2 text-sm text-slate-600 hover:text-slate-900 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}

function NavLink({
  href,
  children,
  icon,
}: {
  href: string
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
    >
      {icon}
      {children}
    </Link>
  )
}

function MobileNavLink({
  href,
  children,
  onClick,
}: {
  href: string
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      className="block px-2 py-2 text-slate-600 hover:text-slate-900 text-sm"
      onClick={onClick}
    >
      {children}
    </Link>
  )
}
