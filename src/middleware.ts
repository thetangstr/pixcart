import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

const COOKIE_NAME = 'ab_variant';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let response = NextResponse.next();
  
  // Handle Supabase authentication for all protected routes
  try {
    const supabase = createClient(request, response);
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // Refresh session if needed
    if (error || !session) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // User exists but session might be stale, refresh it
        await supabase.auth.refreshSession();
      }
    }
    
    // Update response with any session changes
    response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
    
    const updatedSupabase = createClient(request, response);
    const { data: { user } } = await updatedSupabase.auth.getUser();
    
    // Protect admin routes
    if (pathname.startsWith('/admin')) {
      if (!user) {
        // Redirect to login if not authenticated
        const loginUrl = new URL('/auth/signin', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
  } catch (error) {
    console.error('Middleware auth error:', error);
    
    // If authentication fails on admin routes, redirect to login
    if (pathname.startsWith('/admin')) {
      const loginUrl = new URL('/auth/signin', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // A/B testing for home page
  if (pathname === '/') {
    const response = NextResponse.next();
    const existingVariant = request.cookies.get(COOKIE_NAME);

    // If no variant cookie exists, set one
    if (!existingVariant) {
      const variant = Math.random() < 0.5 ? 'simple' : 'detailed';
      response.cookies.set(COOKIE_NAME, variant, {
        maxAge: COOKIE_MAX_AGE,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
      });
    }

    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/api/user/:path*',
    '/api/admin/:path*',
    '/api/generate',
    '/create',
    '/dashboard',
    '/profile'
  ]
};