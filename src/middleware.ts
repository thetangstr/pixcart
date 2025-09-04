import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Initialize Prisma client
const prisma = new PrismaClient()

// Define public paths that don't require allowlist check
const publicPaths = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/callback',
  '/auth/error',
  '/auth/signout',
  '/waitlist',
  '/api/auth',
]

// Define admin paths
const adminPaths = [
  '/admin',
]

// Auto-allowlisted admin email
const ADMIN_EMAIL = 'thetangstr@gmail.com'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if needed
  const { data: { session } } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname

  // Skip allowlist check for public paths and static files
  if (publicPaths.some(path => pathname.startsWith(path)) || 
      pathname.startsWith('/_next') || 
      pathname.startsWith('/api/auth') ||
      pathname.includes('.')) {
    return response
  }

  // If user is not authenticated, redirect to signin
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  const userEmail = session.user.email

  try {
    // Check if user exists in database and get their status
    let user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: {
        id: true,
        email: true,
        isAdmin: true,
        isAllowlisted: true,
        isWaitlisted: true,
      }
    })

    // If user doesn't exist, create them
    if (!user) {
      const isAutoAdmin = userEmail === ADMIN_EMAIL
      user = await prisma.user.create({
        data: {
          id: session.user.id,
          email: userEmail,
          name: session.user.user_metadata?.full_name || null,
          image: session.user.user_metadata?.avatar_url || null,
          isAdmin: isAutoAdmin,
          isAllowlisted: isAutoAdmin,
          isWaitlisted: !isAutoAdmin,
        },
        select: {
          id: true,
          email: true,
          isAdmin: true,
          isAllowlisted: true,
          isWaitlisted: true,
        }
      })
    }

    // Auto-approve admin user if they aren't already
    if (userEmail === ADMIN_EMAIL && (!user.isAdmin || !user.isAllowlisted)) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          isAdmin: true,
          isAllowlisted: true,
          isWaitlisted: false,
          approvedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          isAdmin: true,
          isAllowlisted: true,
          isWaitlisted: true,
        }
      })
    }

    // Check if trying to access admin paths
    if (adminPaths.some(path => pathname.startsWith(path))) {
      if (!user.isAdmin) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // If admin, bypass all other restrictions
    if (user.isAdmin) {
      return response
    }

    // If user is waitlisted and not allowlisted, redirect to waitlist page
    if (user.isWaitlisted && !user.isAllowlisted && pathname !== '/waitlist') {
      return NextResponse.redirect(new URL('/waitlist', request.url))
    }

    // If user is allowlisted, they can access all pages
    if (user.isAllowlisted) {
      return response
    }

    // Default: redirect to waitlist
    return NextResponse.redirect(new URL('/waitlist', request.url))

  } catch (error) {
    console.error('Middleware error:', error)
    // On error, allow access to avoid blocking users
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}