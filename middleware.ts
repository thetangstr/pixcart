import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if the request is for the admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Get session cookie
    const session = request.cookies.get('session')
    
    // In development, allow access for testing
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next()
    }
    
    // Check if user is authenticated
    if (!session) {
      // Redirect to login page
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // TODO: Check if user has admin role
    // For now, any authenticated user can access admin
    // In production, you would verify the session and check user role
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}