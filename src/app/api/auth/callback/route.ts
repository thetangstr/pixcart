import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkUserAllowlist } from '@/lib/allowlist-check';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data?.user) {
      // Check if user is on the allowlist
      const { allowed, isWaitlisted } = await checkUserAllowlist(data.user.email);
      
      if (!allowed) {
        // User is not allowlisted - sign them out and redirect to waitlist
        await supabase.auth.signOut();
        
        // Redirect to waitlist page with message
        const waitlistUrl = new URL('/waitlist', request.url);
        if (isWaitlisted) {
          waitlistUrl.searchParams.set('status', 'pending');
        }
        return NextResponse.redirect(waitlistUrl);
      }
      
      // User is allowlisted, proceed to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // If no code or error, redirect to home
  return NextResponse.redirect(new URL('/', request.url));
}