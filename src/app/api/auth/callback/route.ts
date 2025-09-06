import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkUserAllowlist } from '@/lib/allowlist-check';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    
    try {
      // Exchange code for session
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (sessionError) {
        console.error('Session exchange error:', sessionError);
        return NextResponse.redirect(new URL('/auth/signin?error=auth_failed', request.url));
      }
      
      // Get the user from the new session
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('User fetch error:', userError);
        return NextResponse.redirect(new URL('/auth/signin?error=no_user', request.url));
      }
      
      // Check if user is on the allowlist
      const { allowed, isWaitlisted, isAdmin } = await checkUserAllowlist(user.email);
      
      if (!allowed) {
        // User is not allowlisted - sign them out and redirect to waitlist
        await supabase.auth.signOut();
        
        // Redirect to waitlist page with message
        const waitlistUrl = new URL('/waitlist', request.url);
        waitlistUrl.searchParams.set('status', 'pending');
        return NextResponse.redirect(waitlistUrl);
      }
      
      // User is allowlisted, redirect to appropriate page
      const redirectUrl = isAdmin && next === '/admin' ? '/admin' : '/dashboard';
      return NextResponse.redirect(new URL(redirectUrl, request.url));
      
    } catch (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(new URL('/auth/signin?error=callback_error', request.url));
    }
  }

  // If no code, redirect to signin
  return NextResponse.redirect(new URL('/auth/signin', request.url));
}