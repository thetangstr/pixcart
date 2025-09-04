import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';

const COOKIE_NAME = 'ab_variant';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Protect admin routes - just check authentication here
  // The admin check will be done client-side
  if (pathname.startsWith('/admin')) {
    const response = NextResponse.next();
    const supabase = createClient(request, response);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/auth/signin', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Let the page component check for admin status
    return response;
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
  matcher: ['/', '/admin/:path*']
};