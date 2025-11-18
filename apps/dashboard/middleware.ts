import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  // Public routes (no auth required)
  const publicRoutes = ['/auth/login', '/auth/signup']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // Check if trying to access protected route without token
  if (!token && !isPublicRoute && pathname !== '/') {
    // Redirect to login
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check if trying to access auth routes with token
  if (token && isPublicRoute) {
    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Continue to route
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
