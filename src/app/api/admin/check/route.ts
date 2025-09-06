import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkUserAllowlist } from "@/lib/allowlist-check";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { 
          isAdmin: false, 
          isAllowlisted: false,
          error: "Not authenticated" 
        },
        { status: 401 }
      );
    }

    const { allowed, isAdmin, user: dbUser } = await checkUserAllowlist(user.email);

    return NextResponse.json({
      isAdmin,
      isAllowlisted: allowed,
      email: user.email,
      userId: user.id,
      dbUser: dbUser ? {
        id: dbUser.id,
        email: dbUser.email,
        isAdmin: dbUser.isAdmin,
        isAllowlisted: dbUser.isAllowlisted
      } : null
    });
  } catch (error: any) {
    console.error("Admin check error:", error);
    return NextResponse.json(
      { 
        isAdmin: false, 
        isAllowlisted: false,
        error: error.message 
      },
      { status: 500 }
    );
  }
}