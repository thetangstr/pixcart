import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // Check cookies
    const cookieStore = cookies();
    const supabaseCookies = {
      authToken: cookieStore.get('sb-auth-token')?.value || 'not found',
      accessToken: cookieStore.get('sb-access-token')?.value || 'not found',
      refreshToken: cookieStore.get('sb-refresh-token')?.value || 'not found',
    };

    // Check Supabase auth
    const supabase = await createClient();
    
    // Try to get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Try to get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Check if we have any auth cookies
    const allCookies = cookieStore.getAll();
    const authCookies = allCookies.filter(c => 
      c.name.includes('sb-') || 
      c.name.includes('auth') || 
      c.name.includes('supabase')
    );

    return NextResponse.json({
      status: 'debug',
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at
      } : null,
      session: session ? {
        access_token: session.access_token ? 'present' : 'missing',
        refresh_token: session.refresh_token ? 'present' : 'missing',
        expires_at: session.expires_at,
        expires_in: session.expires_in
      } : null,
      errors: {
        session: sessionError?.message || null,
        user: userError?.message || null
      },
      authCookies: authCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite
      })),
      cookieCount: authCookies.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}